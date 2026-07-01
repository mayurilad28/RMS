/**
 * Scanner routes.
 *
 * POST /api/scanner/quick-scan
 *   multipart/form-data:
 *     file:            resume (PDF / DOC / DOCX)             — required
 *     jobDescription:  free-text JD                          — optional*
 *     jobFile:         JD as a file (PDF / DOC / DOCX)       — optional*
 *
 *   * Provide EITHER `jobDescription` text OR a `jobFile`. If both
 *     are sent the uploaded file wins.
 *
 * Note: `uploadMemory.fields(...)` keeps every file ONLY in RAM — nothing
 * is written to the `uploads/` folder for this endpoint.
 */

const express = require('express');
const uploadMemory = require('../middleware/uploadMemory');
const { quickScan } = require('../controllers/scannerController');

const router = express.Router();

router.post(
  '/quick-scan',
  uploadMemory.fields([
    { name: 'file', maxCount: 1 },
    { name: 'jobFile', maxCount: 1 },
  ]),
  quickScan
);

module.exports = router;
