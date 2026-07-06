/**
 * MongoDB connection via Mongoose.
 *
 * We export a function (not a connection object) so the caller can `await`
 * the connection before starting the HTTP server.
 *
 * Note on DNS: `mongodb+srv://` URIs require an SRV record lookup. Some ISPs
 * and corporate routers block SRV queries on the default resolver, which
 * surfaces as `querySrv ECONNREFUSED`. Forcing Node to use Google's
 * public DNS bypasses the broken resolver without changing system settings.
 */

const dns = require('dns');
const mongoose = require('mongoose');

// The DNS workaround is only needed on local dev machines whose ISP /
// corporate router blocks SRV record lookups (the symptom is
// `querySrv ECONNREFUSED ...`). Hosting providers like Render and
// Vercel have fine resolvers, so overriding them in production can
// actually introduce its own problems — keep the override dev-only.
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
}

/**
 * On Vercel, a single warm container can serve many requests, and every
 * time it goes cold Node starts fresh. We cache the connection promise
 * on `globalThis` (survives across warm invocations) so we don't open
 * a new socket to Atlas on every request — that would quickly exhaust
 * the Atlas connection cap.
 */
async function connectDB() {
  if (globalThis.__mongooseConn) return globalThis.__mongooseConn;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('MONGO_URI is not set — skipping MongoDB connection (dev only)');
    return Promise.resolve();
  }

  // Serverless-friendly pool defaults — small pool and quick server
  // selection so a cold Vercel request fails fast instead of hanging.
  // Locally we let Mongoose use its defaults (larger pool, 30 s
  // selection timeout) so a briefly flaky network doesn't crash dev.
  const options =
    process.env.NODE_ENV === 'production'
      ? { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 }
      : {};

  globalThis.__mongooseConn = (async () => {
    await mongoose.connect(uri, options);
    console.log('MongoDB connected');

    // Reconcile indexes with the current schemas.
    //
    // When a schema's indexes change (e.g. we switched `name` from a
    // single-field unique index to a compound `(owner, name)` index),
    // Mongoose adds the new index but does NOT drop the obsolete one.
    // `syncIndexes()` drops indexes that no longer exist in the schema
    // and creates any that are missing, leaving the collection in a
    // consistent state.
    //
    // We run this only once per warm container (guarded by the same
    // `__mongooseConn` cache) so it doesn't slow down every request.
    try {
      const Category = require('../models/Category');
      const Resume = require('../models/Resume');
      const User = require('../models/User');
      await Promise.all([
        Category.syncIndexes(),
        Resume.syncIndexes(),
        User.syncIndexes(),
      ]);
      console.log('Indexes synced');
    } catch (err) {
      console.warn('[warn] index sync failed:', err.message);
    }
  })().catch((err) => {
    // Wipe the cache so the next request retries.
    globalThis.__mongooseConn = null;
    throw err;
  });

  return globalThis.__mongooseConn;
}

module.exports = connectDB;
