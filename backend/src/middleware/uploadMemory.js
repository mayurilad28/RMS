/**
 * Multer middleware that keeps the uploaded file ONLY in memory.
 *
 * Used by the Quick Scan endpoint: we just want to parse the resume and
 * compute a score — never save it. After the request finishes the buffer
 * is garbage-collected.
 */

const multer = require('multer');

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  // Image formats for OCR
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
]);

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, or TXT files are allowed'));
  }
}

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = uploadMemory;
