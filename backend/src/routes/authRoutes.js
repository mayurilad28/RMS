/**
 * Auth routes.
 *
 *   POST /api/auth/register  → create account, returns { user, token }
 *   POST /api/auth/login     → exchange credentials for { user, token }
 *   GET  /api/auth/me        → returns the current user (Bearer required)
 */

const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);

module.exports = router;
