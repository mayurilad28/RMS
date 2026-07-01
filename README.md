# Resume Scanner App

A learning-focused full-stack app to upload, parse, and search resumes by category.

**Tech stack:**
- **Frontend:** Angular
- **Backend:** Node.js + Express
- **Database:** MongoDB (via Mongoose)
- **File parsing:** `pdf-parse` (PDF) + `mammoth` (DOCX)

## Features

- Create / list / delete **categories** (e.g. Frontend Developer, QA, DevOps, HR)
- Upload resumes (PDF, DOC, DOCX) under a category
- Auto-extract: name, email, phone, skills, experience (years), location, raw text
- Search & filter candidates by skills, min experience, location, or category
- Add new categories anytime

## Folder structure

```
resume-scanner-app/
├── backend/        # Node.js + Express + MongoDB API
└── frontend/       # Angular app
```

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org/))
- MongoDB running locally on `mongodb://127.0.0.1:27017`
  (or use a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)
- Angular CLI: `npm install -g @angular/cli`

## Quick start

### 1. Backend

```bash
cd backend
npm install
# create .env (see backend/.env.example)
npm run dev
```

API runs at `http://localhost:5000`.

### 2. Frontend

```bash
cd frontend
npm install
ng serve
```

App runs at `http://localhost:4200`.

## Backend API endpoints

| Method | Endpoint                          | Auth   | Description                                                  |
| ------ | --------------------------------- | ------ | ------------------------------------------------------------ |
| POST   | `/api/auth/register`              | public | Create an account, returns `{ user, token }`                 |
| POST   | `/api/auth/login`                 | public | Exchange credentials for `{ user, token }`                   |
| GET    | `/api/auth/me`                    | Bearer | Returns the current user                                     |
| POST   | `/api/scanner/quick-scan`         | public | Score a resume against a JD (form-data: `file`, `jobFile`/`jobDescription`) |
| GET    | `/api/categories`                 | Bearer | List the current user's categories                           |
| POST   | `/api/categories`                 | Bearer | Create a category `{ name }`                                 |
| DELETE | `/api/categories/:id`             | Bearer | Delete a category                                            |
| POST   | `/api/resumes/upload/:categoryId` | Bearer | Upload a resume file (form-data: `file`)                     |
| GET    | `/api/resumes`                    | Bearer | List current user's resumes (supports filters)               |
| GET    | `/api/resumes/:id`                | Bearer | Get one resume                                               |
| DELETE | `/api/resumes/:id`                | Bearer | Delete a resume                                              |

> "Bearer" means: send `Authorization: Bearer <token>` (the token returned by `register`/`login`).

**Search/filter query params on `GET /api/resumes`:**

- `categoryId=<id>` — only resumes in this category
- `skills=react,node` — comma-separated skills (any-match)
- `minExperience=2` — minimum years of experience
- `location=pune` — case-insensitive substring match
- `q=keyword` — full-text search in raw resume text

## What you'll learn (backend)

1. **Express app structure** — routes vs controllers vs models (MVC)
2. **Mongoose schemas & relationships** — referencing one model from another
3. **File uploads with Multer** — disk storage, file filtering, size limits
4. **Async file parsing** — reading binary files and extracting text
5. **Regex-based information extraction** — emails, phones, skills
6. **REST query parameters** — building flexible search endpoints
7. **Error handling middleware** — centralized error responses
8. **Environment variables** — separating config from code

## Deploy to production

The entire app runs on **Vercel** — the Angular frontend as a static build, the Express API as a serverless function under `/api/*`, and resume files on **Vercel Blob**. Mongo stays on Atlas.

```
Browser
  │
  ▼
┌──────────────────────────────────────────────────┐
│                Vercel deployment                 │
│                                                  │
│   Angular static  ─────▶  /api/index.js (Node)   │
│   (from frontend/dist)     wraps backend/src/app │
│                                                  │
└──────────────────────────────────────────────────┘
        │                          │
        │                          ├──▶ Vercel Blob (resume files)
        │                          │
        │                          └──▶ MongoDB Atlas (data)
```

### 1. Push to GitHub

Make sure the repo is on GitHub — Vercel deploys from a Git provider.

### 2. Create the Vercel project

1. Open [vercel.com](https://vercel.com) → **Add New… → Project** → import your repo.
2. In the import dialog **leave "Root Directory" empty** (project root — Vercel reads the root `vercel.json` and drives everything from there). Framework Preset: *Other*.
3. Don't click Deploy yet — first set the env vars below.

### 3. Set Environment Variables (Production + Preview)

In **Project Settings → Environment Variables** add:

| Name | Value |
|---|---|
| `MONGO_URI` | your MongoDB Atlas connection string |
| `JWT_SECRET` | any long random string, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |

### 4. Enable Vercel Blob

1. Project → **Storage** tab → **Create Database** → choose **Blob**.
2. Vercel creates the store and automatically wires `BLOB_READ_WRITE_TOKEN` as a project env var — you do not need to add it manually.

### 5. Deploy

Click **Deploy**. First build takes ~2 min. Vercel will:

- run `npm run install:all` (installs both `backend/` and `frontend/` deps)
- run `npm run build` (Angular production build → `frontend/dist/resume-scanner-frontend/browser/`)
- treat `api/index.js` as a Node serverless function; every `/api/*` request hits it

### 6. Atlas Network Access

MongoDB Atlas → **Network Access** → make sure `0.0.0.0/0` (allow from anywhere) is on the whitelist. Vercel functions don't have static outbound IPs to pin.

### 7. Try it

Open the URL Vercel gave you (`https://your-project.vercel.app`). Register an account, upload a resume, run Quick Scan — everything should work same-origin (no CORS headache).

### Files that make the deploy work

| Path | What it does |
|---|---|
| `vercel.json` (repo root) | Install/build commands, output dir, `/api/*` rewrite to the serverless function, SPA fallback |
| `package.json` (repo root) | Orchestrates the monorepo — `install:all` and `build` scripts Vercel calls |
| `api/index.js` | Serverless entry: connects to Mongo once per warm container, then delegates to `backend/src/app.js` |
| `backend/src/config/db.js` | Caches the Mongoose connection on `globalThis` so we don't blow through Atlas's connection cap on every request |
| `backend/src/middleware/upload.js` | Now uses in-memory storage (Vercel functions have a read-only filesystem) |
| `backend/src/utils/blobStorage.js` | Thin wrapper around `@vercel/blob` for `put` / `del` |
| `backend/src/controllers/resumeController.js` | Uploads the parsed resume buffer to Vercel Blob, stores the returned URL on the Resume doc, and redirects downloads to that URL |
| `frontend/src/environments/environment.prod.ts` | `apiBase = ''` — the frontend calls same-origin `/api/*` in production |

### Known limits

- **Serverless request body limit is 4.5 MB.** Uploaded resumes larger than that will 413. If you need bigger, switch to the client-side Blob upload flow (frontend uploads directly to Blob with a short-lived token, then POSTs the URL to your API).
- **Function execution time** is capped at 30 s (set in `vercel.json`). PDF/DOCX parsing normally finishes in well under 2 s, but a huge scanned PDF that falls back to `pdfjs-dist` can be slower — most JD-sized files are fine.
- **Vercel Blob free tier** is 500 MB storage + 5 GB bandwidth/month, plenty for a portfolio demo.
- **Cold starts** are ~1–2 s the first time an idle function is called; subsequent requests to the same warm container are instant.
