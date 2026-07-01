/**
 * Category controller — business logic for /api/categories.
 *
 * Each function is an Express request handler. They are kept thin: read
 * input, call the model, send a response. Anything thrown is forwarded
 * to the error-handling middleware via `next(err)`.
 *
 * All routes are guarded by `requireAuth`, so `req.user` is always set.
 * Every query is scoped by `owner: req.user._id` so users only ever
 * see their own categories.
 */

const Category = require('../models/Category');
const Resume = require('../models/Resume');

async function listCategories(req, res, next) {
  try {
    const ownerId = req.user._id;
    const categories = await Category.find({ owner: ownerId }).sort({ name: 1 });

    // Attach a resume count to each category so the UI can show "12 resumes".
    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await Resume.countDocuments({
          category: cat._id,
          owner: ownerId,
        });
        return { ...cat.toObject(), resumeCount: count };
      })
    );

    res.json(withCounts);
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || '',
      owner: req.user._id,
    });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const ownerId = req.user._id;

    const deleted = await Category.findOneAndDelete({
      _id: id,
      owner: ownerId,
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found' });
    }
    // Also remove any resumes tied to this category (scoped to the owner
    // for safety — the index makes this fast either way).
    await Resume.deleteMany({ category: id, owner: ownerId });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCategories,
  createCategory,
  deleteCategory,
};
