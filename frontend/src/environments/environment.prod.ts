/**
 * Production environment.
 *
 * On Vercel the API is served from the SAME origin as the frontend
 * (via `api/index.js` + the rewrite in root `vercel.json`), so we
 * hit `/api/…` relative to the current host. No cross-origin, no
 * CORS, no domain to configure.
 *
 * `angular.json` swaps this file in for the production build via
 * `fileReplacements`, so this only affects `ng build` output — dev
 * `ng serve` still uses `environment.ts` and talks to
 * `http://localhost:5000` as before.
 */
export const environment = {
  production: true,
  apiBase: '',
};
