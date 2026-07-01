/**
 * Resume model.
 *
 * Stores both file metadata (where the file lives on disk) and the
 * information extracted from the resume by our parser.
 *
 * Note: `category` is an ObjectId pointing at a Category document.
 * Using `ref: 'Category'` lets us `.populate('category')` to pull
 * the category fields when reading resumes.
 */

const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // File metadata. The file itself lives on Vercel Blob (durable
    // cloud storage); we keep the metadata + the Blob URL here so
    // downloads can redirect to it.
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },

    // Extracted information (filled in by utils/resumeParser.js)
    candidateName: { type: String, default: '' },
    email: { type: String, default: '', index: true },
    phone: { type: String, default: '' },
    location: { type: String, default: '', index: true },
    skills: { type: [String], default: [], index: true },
    experienceYears: { type: Number, default: 0 },
    rawText: { type: String, default: '' },
  },
  { timestamps: true }
);

// Enable simple full-text search over the raw resume text + key fields.
resumeSchema.index({
  rawText: 'text',
  candidateName: 'text',
  skills: 'text',
  location: 'text',
});

module.exports = mongoose.model('Resume', resumeSchema);
