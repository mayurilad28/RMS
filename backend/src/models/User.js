/**
 * User model.
 *
 * Holds the credentials and profile fields for an HR user of the app.
 *
 * Important conventions used here:
 *  - Passwords are never stored in plain text. We hash with bcrypt in a
 *    pre-save hook, and we expose a `comparePassword` helper to verify
 *    a login attempt against the stored hash.
 *  - `passwordHash` is `select: false` so it is omitted from queries by
 *    default. We have to explicitly `.select('+passwordHash')` when we
 *    actually need to compare against it (i.e. during login).
 *  - `toJSON` is overridden to scrub any sensitive fields before the
 *    user object is returned to the client.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [4, 'Full name must be at least 4 characters'],
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

/**
 * Hash the password whenever it changes.
 *
 * We attach a virtual `password` setter so the controller can do
 * `user.password = req.body.password` and we'll hash it transparently.
 *
 * Important: we hash inside `pre('validate')` (not `pre('save')`),
 * because Mongoose runs validation BEFORE save hooks. If we hashed in
 * `pre('save')`, the required-field check on `passwordHash` would fire
 * first and the document would be rejected as "passwordHash required"
 * even though the caller provided a plain password.
 */
userSchema.virtual('password').set(function (plain) {
  this._plainPassword = plain;
});

userSchema.pre('validate', async function (next) {
  if (!this._plainPassword) return next();
  try {
    this.passwordHash = await bcrypt.hash(this._plainPassword, SALT_ROUNDS);
    this._plainPassword = undefined;
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function (plain) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
