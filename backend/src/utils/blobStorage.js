/**
 * Thin wrapper around Vercel Blob so the rest of the app can pretend it
 * is talking to a plain "put file / delete file" service.
 *
 * Docs: https://vercel.com/docs/storage/vercel-blob
 *
 * The Blob token is provided by Vercel automatically as
 * `BLOB_READ_WRITE_TOKEN` when you enable Blob for your project.
 * Locally, either set it in `backend/.env` or leave uploads offline.
 */

const { put, del } = require('@vercel/blob');
const path = require('path');
const crypto = require('crypto');

const CONTAINER = 'resumes';

/**
 * Upload a resume file buffer to Vercel Blob and return its permanent URL.
 *
 * We prefix each stored object with a random slug so two uploads with
 * the same original name don't overwrite each other, and we keep the
 * original extension so browsers pick the right viewer on download.
 */
async function uploadResumeFile(buffer, originalName, mimeType) {
  const ext = path.extname(originalName || '').toLowerCase() || '.bin';
  const slug = crypto.randomBytes(8).toString('hex');
  const key = `${CONTAINER}/${Date.now()}-${slug}${ext}`;

  const result = await put(key, buffer, {
    access: 'public', // Public URL. Fine for a learning project;
    // swap to private + signed URLs when handling real HR data.
    contentType: mimeType,
    addRandomSuffix: false, // We already made the key unique.
  });

  return { url: result.url, storedName: key };
}

/**
 * Best-effort delete. We never want a failed cleanup to break a
 * user's "delete resume" flow, so we swallow errors and just log.
 */
async function deleteResumeFile(url) {
  if (!url) return;
  try {
    await del(url);
  } catch (err) {
    console.warn('[warn] blob delete failed:', err.message);
  }
}

module.exports = { uploadResumeFile, deleteResumeFile };
