/**
 * Resume parser.
 *
 * Pipeline:
 *   1. Read the uploaded file from disk.
 *   2. Extract plain text using `pdf-parse` (PDF) or `mammoth` (DOCX).
 *      DOC (legacy binary) is partially supported as text-only.
 *   3. Run regex / keyword matching on the text to pull out:
 *        - email, phone
 *        - candidate name (best-effort: first non-empty line near the top)
 *        - location (matched against a small list of Indian cities; you can
 *          extend `KNOWN_LOCATIONS` as needed)
 *        - skills (matched against `KNOWN_SKILLS`)
 *        - years of experience (looks for "X years" / "X+ years" patterns)
 *
 * Regex extraction is intentionally naive — it's enough to learn the
 * pipeline without pulling in heavy NLP libraries. You can swap this
 * out for an AI call later without touching the rest of the backend.
 */

const fs = require('fs/promises');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// pdfjs-dist is the official Mozilla PDF library — slower than pdf-parse but
// far more tolerant of non-standard PDFs (Indeed/LinkedIn exports, etc.).
// v4+ is ESM-only so we load it lazily via dynamic import and cache the result.
let _pdfjsPromise = null;
function loadPdfJs() {
  if (!_pdfjsPromise) {
    _pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return _pdfjsPromise;
}

/**
 * Robust PDF text extraction.
 *
 * Strategy:
 *  1. Try `pdf-parse` first — fast, no dependencies to spin up.
 *  2. If it throws (corrupt xref, unusual structure, etc.), fall back to
 *     `pdfjs-dist` which handles many more edge cases.
 *  3. If both fail, surface a friendly user-facing error.
 */
async function extractPdfText(buffer) {
  try {
    const data = await pdfParse(buffer);
    if (data.text && data.text.trim().length > 0) return data.text;
    // pdf-parse "succeeded" but returned no text — fall through to pdfjs.
  } catch (_err) {
    // swallow and fall through; the pdfjs fallback will give us a real chance
  }

  try {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
      verbosity: 0,
    }).promise;

    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      text += pageText + '\n';
    }
    return text;
  } catch (err) {
    const lower = (err.message || '').toLowerCase();
    if (lower.includes('password') || lower.includes('encrypted')) {
      throw makeParseError(
        'This PDF is password-protected. Please remove the password and try again.'
      );
    }
    throw makeParseError(
      'Could not read this PDF — it may be corrupted or saved in an unsupported format. ' +
        'Please re-save it as a fresh PDF (or export to DOCX / TXT) and try again.'
    );
  }
}

const KNOWN_SKILLS = [
  // Frontend
  'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap',
  'javascript', 'typescript',
  'angular', 'react', 'vue', 'next.js', 'nuxt', 'redux', 'rxjs', 'ngrx',
  // Backend
  'node.js', 'nodejs', 'express', 'nestjs', 'fastify',
  'python', 'django', 'flask', 'fastapi',
  'java', 'spring', 'spring boot',
  'c#', '.net', 'asp.net',
  'go', 'golang', 'rust', 'php', 'laravel', 'ruby', 'rails',
  // Databases
  'mongodb', 'mongoose', 'mysql', 'postgresql', 'postgres', 'sqlite',
  'redis', 'elasticsearch', 'dynamodb',
  // DevOps / Cloud
  'docker', 'kubernetes', 'jenkins', 'github actions', 'gitlab ci',
  'aws', 'azure', 'gcp', 'terraform', 'ansible',
  // QA
  'selenium', 'cypress', 'playwright', 'jest', 'mocha', 'chai',
  'junit', 'testng', 'postman', 'jmeter',
  // Other
  'git', 'rest', 'graphql', 'agile', 'scrum',
];

const KNOWN_LOCATIONS = [
  'pune', 'mumbai', 'bangalore', 'bengaluru', 'hyderabad', 'chennai',
  'delhi', 'new delhi', 'noida', 'gurgaon', 'gurugram', 'kolkata',
  'ahmedabad', 'jaipur', 'indore', 'kochi', 'thiruvananthapuram',
  'remote', 'work from home',
];

/**
 * Wraps a parser error in a tagged Error so the controller layer can
 * detect it and respond with HTTP 400 (bad input) instead of 500 (server bug).
 */
function makeParseError(message) {
  const err = new Error(message);
  err.code = 'RESUME_PARSE_FAILED';
  err.status = 400;
  return err;
}

async function extractTextFromBuffer(buffer, mimeType) {
  if (mimeType === 'application/pdf') {
    return extractPdfText(buffer);
  }

  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (err) {
      throw makeParseError(`Couldn't read this DOCX: ${err.message}`);
    }
  }

  // Legacy .doc — mammoth doesn't support it; fall back to a raw string read.
  // The user will at least see *something* and the email/phone regex still works.
  if (mimeType === 'application/msword') {
    return buffer.toString('utf8');
  }

  // Plain text — decode as UTF-8.
  if (mimeType === 'text/plain') {
    return buffer.toString('utf8');
  }

  return '';
}

async function extractText(filePath, mimeType) {
  const buffer = await fs.readFile(filePath);
  return extractTextFromBuffer(buffer, mimeType);
}

function extractInfoFromText(text) {
  const cleaned = text.replace(/\u0000/g, '');
  return {
    rawText: cleaned,
    candidateName: extractCandidateName(cleaned),
    email: extractEmail(cleaned),
    phone: extractPhone(cleaned),
    location: extractLocation(cleaned),
    skills: extractSkills(cleaned),
    experienceYears: extractExperienceYears(cleaned),
  };
}

function extractEmail(text) {
  const match = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return match ? match[0] : '';
}

function extractPhone(text) {
  // Matches international +CC and plain 10-digit numbers with separators.
  const match = text.match(/(\+?\d{1,3}[\s-]?)?(\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4}/);
  return match ? match[0].trim() : '';
}

function extractCandidateName(text) {
  // Heuristic: the first non-empty, non-email line of the resume that
  // looks like a name (2-4 capitalised words).
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 10)) {
    if (line.includes('@')) continue;
    if (/\d/.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const looksLikeName = words.every((w) => /^[A-Z][a-zA-Z.'-]*$/.test(w));
      if (looksLikeName) return line;
    }
  }
  return '';
}

function extractLocation(text) {
  const lower = text.toLowerCase();
  for (const loc of KNOWN_LOCATIONS) {
    if (lower.includes(loc)) {
      return loc
        .split(' ')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ');
    }
  }
  return '';
}

function extractSkills(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const skill of KNOWN_SKILLS) {
    // \b doesn't work for tokens with `.` or `+`, so we check raw substring
    // but require a non-letter boundary on both sides to avoid false hits
    // (e.g. "go" inside "google").
    const idx = lower.indexOf(skill);
    if (idx === -1) continue;
    const before = lower[idx - 1] || ' ';
    const after = lower[idx + skill.length] || ' ';
    if (/[a-z0-9]/.test(before) || /[a-z0-9]/.test(after)) continue;
    found.add(skill);
  }
  return Array.from(found);
}

function extractExperienceYears(text) {
  // Find numbers preceding "year(s)" and take the largest reported figure.
  const regex = /(\d+(?:\.\d+)?)\s*\+?\s*years?/gi;
  let max = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const years = parseFloat(m[1]);
    if (!Number.isNaN(years) && years < 60 && years > max) max = years;
  }
  return max;
}

/**
 * Main entry — given a file's absolute path and MIME type, return all the
 * extracted fields ready to be saved on a `Resume` document.
 */
async function parseResume(filePath, mimeType) {
  const text = await extractText(filePath, mimeType);
  return extractInfoFromText(text);
}

/**
 * Same as `parseResume`, but reads the file from an in-memory Buffer.
 * Useful for the "Quick Scan" endpoint where we never persist the file.
 */
async function parseResumeFromBuffer(buffer, mimeType) {
  const text = await extractTextFromBuffer(buffer, mimeType);
  return extractInfoFromText(text);
}

module.exports = {
  parseResume,
  parseResumeFromBuffer,
  extractTextFromBuffer,
  extractSkills,
  KNOWN_SKILLS,
  // exported for unit tests / experimentation
  _internals: {
    extractEmail,
    extractPhone,
    extractCandidateName,
    extractLocation,
    extractSkills,
    extractExperienceYears,
  },
};

// Silence pdf-parse's debug branch — it looks for a test file at startup
// when required from certain entry points. Touching `path` keeps eslint happy.
void path;
