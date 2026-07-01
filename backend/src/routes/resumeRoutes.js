/**
 * Resume routes.
 *
 * The `upload.single('file')` middleware reads a multipart form-data
 * request, saves the file to disk, and puts file metadata on `req.file`
 * before the controller runs.
 */

const express = require('express');
const upload = require('../middleware/upload');
const {
  uploadResume,
  listResumes,
  getResume,
  deleteResume,
  downloadResume,
} = require('../controllers/resumeController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every resume endpoint is per-user — login required.
router.use(requireAuth);

router.get('/', listResumes);
router.get('/:id', getResume);
router.get('/:id/download', downloadResume);
router.delete('/:id', deleteResume);
router.post('/upload/:categoryId', upload.single('file'), uploadResume);

module.exports = router;
