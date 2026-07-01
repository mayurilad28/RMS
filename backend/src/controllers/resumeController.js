/**
 * Resume controller — business logic for /api/resumes.
 *
 * Handles:
 *  - uploading a resume file (multer parses the multipart body into
 *    `req.file.buffer` in memory — nothing hits disk)
 *  - parsing the buffer, stashing the file on Vercel Blob, saving the
 *    extracted data to MongoDB
 *  - listing / filtering / fetching / deleting resumes
 *  - downloading (redirect to the Blob URL)
 *
 * All routes are guarded by `requireAuth`, so `req.user` is always set.
 * Every query is scoped by `owner: req.user._id` so users only ever
 * see (and delete) their own resumes.
 */

const Resume = require('../models/Resume');
const Category = require('../models/Category');
const { parseResumeFromBuffer } = require('../utils/resumeParser');
const {
  uploadResumeFile,
  deleteResumeFile,
} = require('../utils/blobStorage');

async function uploadResume(req, res, next) {
  let uploadedBlobUrl = null;
  try {
    const { categoryId } = req.params;
    const ownerId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Make sure the category exists AND belongs to this user.
    const category = await Category.findOne({ _id: categoryId, owner: ownerId });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Parse the resume directly from the in-memory buffer.
    const parsed = await parseResumeFromBuffer(
      req.file.buffer,
      req.file.mimetype
    );

    // Push the file to Vercel Blob so we can serve downloads later.
    const { url, storedName } = await uploadResumeFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    uploadedBlobUrl = url;

    const resume = await Resume.create({
      category: category._id,
      owner: ownerId,
      originalName: req.file.originalname,
      storedName,
      fileUrl: url,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      ...parsed,
    });

    const populated = await resume.populate('category', 'name');
    res.status(201).json(populated);
  } catch (err) {
    // If we already uploaded to Blob but the DB write failed, don't
    // leak an orphaned file — clean up before propagating the error.
    if (uploadedBlobUrl) {
      await deleteResumeFile(uploadedBlobUrl);
    }
    next(err);
  }
}

async function listResumes(req, res, next) {
  try {
    const { categoryId, skills, minExperience, location, q } = req.query;

    const filter = { owner: req.user._id };
    if (categoryId) filter.category = categoryId;
    if (location) filter.location = new RegExp(location, 'i');
    if (minExperience) {
      const min = Number.parseFloat(minExperience);
      if (!Number.isNaN(min)) filter.experienceYears = { $gte: min };
    }
    if (skills) {
      const list = skills
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (list.length) filter.skills = { $in: list };
    }
    if (q) filter.$text = { $search: q };

    const resumes = await Resume.find(filter)
      .select('-rawText') // keep list payload small
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    res.json(resumes);
  } catch (err) {
    next(err);
  }
}

async function getResume(req, res, next) {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).populate('category', 'name');
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    res.json(resume);
  } catch (err) {
    next(err);
  }
}

async function deleteResume(req, res, next) {
  try {
    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    // Best-effort Blob cleanup — never blocks the response.
    await deleteResumeFile(resume.fileUrl);
    res.json({ message: 'Resume deleted' });
  } catch (err) {
    next(err);
  }
}

async function downloadResume(req, res, next) {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    // Blob URLs are directly downloadable — 302 the browser at it and
    // let Vercel Blob serve the bytes.
    res.redirect(resume.fileUrl);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadResume,
  listResumes,
  getResume,
  deleteResume,
  downloadResume,
};
