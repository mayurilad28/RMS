/**
 * Entry point for the backend.
 *
 * Responsibilities:
 *  1. Load environment variables from .env
 *  2. Connect to MongoDB
 *  3. Start the Express HTTP server
 *
 * Keeping `server.js` tiny (only "boot the server") and putting all the
 * Express setup in `src/app.js` makes the app easier to test later.
 */

require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
