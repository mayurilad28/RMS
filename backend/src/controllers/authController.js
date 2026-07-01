/**
 * Auth controller — register, login, and "who am I".
 *
 * Flow at a glance:
 *  - register: validate input → create user (password is hashed by the model)
 *              → issue JWT → return { user, token }
 *  - login:    look up user (with passwordHash) → bcrypt-compare → issue JWT
 *              → return { user, token }
 *  - me:       requireAuth middleware put the user on req.user, just echo it
 *
 * JWTs are stateless: we only store a `sub` claim (= user id). On every
 * request, the middleware verifies the signature and re-fetches the user
 * from Mongo to make sure they still exist.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Same rules enforced on the frontend — keep them in lockstep.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_NAME_LENGTH = 4;
const MIN_PASSWORD_LENGTH = 8;

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in .env');
  }
  return jwt.sign({ sub: userId.toString() }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body || {};

    if (!name?.trim() || !email?.trim() || !password) {
      return res
        .status(400)
        .json({ error: 'Name, email and password are required.' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < MIN_NAME_LENGTH) {
      return res
        .status(400)
        .json({ error: `Full name must be at least ${MIN_NAME_LENGTH} characters.` });
    }

    const trimmedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res
        .status(400)
        .json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const user = new User({ name: trimmedName, email: trimmedEmail });
    user.password = password; // virtual setter → hashed in pre-save
    await user.save();

    const token = signToken(user._id);
    return res.status(201).json({ user: user.toJSON(), token });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }
    // Mongoose validation errors → 400 with the first friendly message
    if (err?.name === 'ValidationError') {
      const first = Object.values(err.errors || {})[0];
      return res.status(400).json({ error: first?.message || 'Invalid input.' });
    }
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // passwordHash is select:false, so we need to opt-in here.
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select('+passwordHash');

    // Same error for "no such user" and "wrong password" to avoid leaking
    // which emails are registered.
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    return res.json({ user: user.toJSON(), token });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user.toJSON() });
}

module.exports = { register, login, me };
