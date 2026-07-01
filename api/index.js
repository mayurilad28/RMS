/**
 * Vercel serverless entry point.
 *
 * Vercel calls the exported function with `(req, res)` on every request
 * matching `/api/*`. We reuse our existing Express app — because
 * `express()` instances are themselves `(req, res, next) => void`
 * handlers, Vercel treats the app as a lambda directly.
 *
 * Two things are worth flagging:
 *
 *  1. **Lazy DB connect + connection reuse.** Serverless functions can
 *     be invoked many times per second, and each cold-start creates a
 *     fresh Node context. We call `connectDB()` on the first request
 *     the container ever sees and cache the promise on `globalThis`
 *     so subsequent requests reuse the exact same Mongoose connection.
 *
 *  2. **No `app.listen()`.** Vercel manages the HTTP server. Our
 *     `backend/server.js` (which does `app.listen(PORT)`) is only used
 *     for local `npm run dev`.
 */

const app = require('../backend/src/app');
const connectDB = require('../backend/src/config/db');

async function ensureReady() {
  if (!globalThis.__mongoReady) {
    globalThis.__mongoReady = connectDB().catch((err) => {
      // Wipe the cached promise so the next request retries instead of
      // permanently failing all requests to this warm container.
      globalThis.__mongoReady = null;
      throw err;
    });
  }
  return globalThis.__mongoReady;
}

module.exports = async (req, res) => {
  try {
    await ensureReady();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[bootstrap] DB connect failed:', err);
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Database unavailable' }));
    return;
  }
  return app(req, res);
};
