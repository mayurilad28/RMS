/**
 * Express application setup.
 *
 * Order matters in Express:
 *   1. Global middleware (CORS, JSON parser)
 *   2. Routes
 *   3. 404 handler
 *   4. Error handler (must be last and take 4 args)
 */

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const scannerRoutes = require('./routes/scannerRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

/**
 * CORS — in production we lock the API to the deployed frontend origin
 * (set `CORS_ORIGIN` in Render env vars, e.g. https://your-app.vercel.app).
 * Locally we accept everything so any dev tool can hit the API freely.
 *
 * `CORS_ORIGIN` can be a single origin or a comma-separated list.
 */
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: false,
  })
);
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'Resume Scanner API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/scanner', scannerRoutes); // Public — Quick Scan does not require login

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
