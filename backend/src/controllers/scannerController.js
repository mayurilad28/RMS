/**
 * Scanner controller — handles the "Quick Scan" endpoint.
 *
 * Flow:
 *  1. Receive a resume file (required) + EITHER `jobDescription` text
 *     OR an uploaded `jobFile` (PDF / DOC / DOCX) — at least one is required.
 *  2. Parse the resume from its in-memory buffer.
 *  3. If a JD file was uploaded, extract text from it; otherwise use the
 *     pasted `jobDescription` text directly.
 *  4. Compute a match score against the resulting JD text.
 *  5. Return the match report + the lightweight extracted info.
 *
 * Nothing is written to disk or to MongoDB — this endpoint is fully stateless.
 */

const {
  parseResumeFromBuffer,
  extractTextFromBuffer,
} = require('../utils/resumeParser');
const { matchResumeToJob } = require('../utils/jobMatcher');

async function quickScan(req, res, next) {
  try {
    // With `upload.fields()`, single-file uploads land on `req.files.<name>[0]`
    const resumeFile = req.files?.file?.[0];
    const jobFile = req.files?.jobFile?.[0];

    if (!resumeFile) {
      return res.status(400).json({ error: 'Resume file is required' });
    }

    // Decide which JD source to use. Uploaded file wins if both are sent.
    let jobDescription = (req.body.jobDescription || '').trim();
    if (jobFile) {
      const extracted = await extractTextFromBuffer(
        jobFile.buffer,
        jobFile.mimetype
      );
      jobDescription = (extracted || '').trim();
    }

    if (!jobDescription) {
      return res.status(400).json({
        error: 'Provide a job description (paste text or upload a file)',
      });
    }

    const parsed = await parseResumeFromBuffer(
      resumeFile.buffer,
      resumeFile.mimetype
    );
    const match = matchResumeToJob(parsed, jobDescription);

    res.json({
      resume: {
        candidateName: parsed.candidateName,
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        skills: parsed.skills,
        experienceYears: parsed.experienceYears,
      },
      jobDescription,
      match,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { quickScan };
