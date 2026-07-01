/**
 * Category routes — wire URL patterns to controller functions.
 */

const express = require('express');
const {
  listCategories,
  createCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every category endpoint is per-user — login required.
router.use(requireAuth);

router.get('/', listCategories);
router.post('/', createCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
