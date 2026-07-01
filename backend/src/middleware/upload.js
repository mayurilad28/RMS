/**
 * Multer middleware for handling resume file uploads.
 *
 * We use **in-memory storage** (not disk) because the app runs as
 * Vercel serverless functions whose filesystem is read-only outside
 * `/tmp` (and `/tmp` is wiped between invocations). Multer parses the
 * incoming multipart body into `req.file.buffer`, and the resume
 * controller then streams that buffer to Vercel Blob for durable
 * storage.
 *
 * - Only PDF / DOC / DOCX are accepted.
 * - Max size is 4.5 MB — Vercel's serverless function request-body
 *   limit is 4.5 MB on both Hobby and Pro tiers. Anything larger has
 *   to use the client-side Blob upload flow.
 */

const multer = require('multer');

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]);

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, or DOCX files are allowed'));
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 4.5 * 1024 * 1024 },
});

module.exports = upload;
