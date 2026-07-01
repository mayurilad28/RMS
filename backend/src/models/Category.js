/**
 * Category model.
 *
 * Represents a job role bucket (Frontend Developer, QA, DevOps, HR, ...).
 * Resumes belong to one category via `Resume.category` (an ObjectId ref).
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Names are unique *per owner* — two different users can both have a
// "Frontend Developer" category without colliding.
categorySchema.index({ owner: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
