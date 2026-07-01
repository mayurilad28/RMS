/**
 * Centralized Express error handler.
 *
 * Any `next(err)` (or thrown error in an async handler that you forward to
 * `next`) ends up here so the API always responds with a consistent JSON shape.
 */

function errorHandler(err, _req, res, _next) {
  console.error('[error]', err);

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
}

module.exports = errorHandler;
