/**
 * Auth middleware.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the JWT,
 * looks up the user, and stashes them on `req.user` for downstream
 * handlers to use. Any failure responds 401 so the client knows to
 * redirect to /login.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_err) {
      return res.status(401).json({ error: 'Token is invalid or expired' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth };
