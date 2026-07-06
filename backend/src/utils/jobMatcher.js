/**
 * Resume ↔ Job Description matcher.
 *
 * Given a parsed resume and a free-text job description, returns a match
 * report:
 *   - score (0-100)
 *   - matchedSkills        — skills present in BOTH resume and JD
 *   - missingSkills        — skills required by JD but not in resume
 *   - extraSkills          — skills in resume but not required by JD
 *   - matchedKeywords      — meaningful words shared by both texts
 *   - missingKeywords      — JD keywords missing from the resume
 *   - experience           — { required, candidate, meets }
 *   - suggestions          — short human-readable tips for improving the score
 *
 * Scoring formula (transparent on purpose — easy to tweak as you learn):
 *   skillsScore   = matched / required_skills * 100   (weight 0.6)
 *   keywordsScore = matched / required_keywords * 100 (weight 0.3)
 *   expScore      = 100 if candidate meets required years, else proportional
 *                                                       (weight 0.1)
 *   final = round(0.6*skills + 0.3*keywords + 0.1*exp)
 */

const { extractSkills, KNOWN_LOCATIONS } = require('./resumeParser');

function extractJobLocation(text) {
  const lower = String(text || '').toLowerCase();
  const orderedLocations = [...KNOWN_LOCATIONS].sort((a, b) => b.length - a.length);
  for (const loc of orderedLocations) {
    if (lower.includes(loc)) {
      return loc
        .split(' ')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ');
    }
  }
  return '';
}

function extractJobTitle(text) {
  const normalized = String(text || '').replace(/\r\n|\r/g, '\n');
  const labelMatch = normalized.match(/(?:^|\n)\s*(?:job title|position|role)\s*[:\-]?\s*([^\n]+)/i);
  if (labelMatch) {
    return labelMatch[1].trim();
  }

  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const titleKeywords = [
    'manager', 'engineer', 'developer', 'designer', 'director', 'officer',
    'analyst', 'consultant', 'specialist', 'coordinator', 'administrator',
    'architect', 'lead', 'supervisor', 'executive', 'sales', 'assistant',
    'trainer', 'operator', 'associate', 'advisor', 'scientist', 'technician',
  ];

  for (const line of lines.slice(0, 6)) {
    const lower = line.toLowerCase();
    if (titleKeywords.some((keyword) => lower.includes(keyword))) {
      return line;
    }
  }
  return '';
}

// Words we always ignore when picking out "keywords" from the JD —
// otherwise every resume would match "the", "and", "with", etc.
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'or', 'the', 'to', 'of', 'in', 'on', 'at', 'for',
  'with', 'as', 'is', 'are', 'be', 'will', 'have', 'has', 'had', 'this',
  'that', 'we', 'you', 'your', 'our', 'their', 'they', 'i', 'it', 'its',
  'by', 'from', 'about', 'into', 'over', 'after', 'before', 'between',
  'should', 'must', 'can', 'may', 'might', 'do', 'does', 'done',
  'who', 'what', 'when', 'where', 'why', 'how',
  'job', 'role', 'team', 'work', 'working', 'company', 'candidate',
  'experience', 'years', 'year', 'plus', 'good', 'great', 'strong',
  'ability', 'skills', 'skill', 'knowledge', 'understanding',
  'preferred', 'required', 'responsibilities', 'qualifications',
  'looking', 'join', 'using', 'use', 'used', 'develop', 'building',
  'including', 'etc', 'eg', 'ie', 'also', 'such', 'any', 'all',
  'plus', 'minimum', 'maximum', 'min', 'max',
]);

function extractKeywords(text) {
  // Split on non-letters, lowercase, keep tokens of length 3+,
  // strip stop words.
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .map((w) => w.replace(/^[.+#]+|[.+#]+$/g, ''))
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    )
  );
}

function extractRequiredYears(jdText) {
  // Find every "N years" / "N+ yrs" mention, but only keep the ones that
  // look like an actual *experience requirement*. We qualify a match by
  // either of two cheap heuristics:
  //
  //   1. it is FOLLOWED (within ~30 chars) by the word "experience" / "exp"
  //      — e.g. "5+ years of relevant experience"
  //   2. it is PRECEDED (within ~25 chars) by a requirement qualifier such
  //      as "minimum", "at least", "atleast", "min", "require"
  //      — e.g. "minimum 3 years"
  //
  // This filters out incidental phrases like "founded 10 years ago" or
  // "10-year strategic roadmap" that used to inflate the required years
  // because the old code simply took the MAX of every match.
  //
  // Among qualifying matches we return the MINIMUM, because real JDs
  // phrase the headline requirement as "at least N years" — i.e. N is
  // the lower bound. If nothing qualifies, return 0 (no specific
  // requirement) so the matcher does not penalise the candidate.
  const text = String(jdText || '').toLowerCase();
  const regex = /(\d+)\s*\+?\s*(?:years?|yrs?)/g;

  const QUALIFIER_BEFORE = /\b(?:minimum|min|at\s*least|atleast|require[ds]?)\b[^\.]{0,25}$/;
  const EXPERIENCE_AFTER = /^[^\.]{0,30}\b(?:exp|experience)\b/;

  const candidates = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isNaN(n) || n < 1 || n > 50) continue;

    const start = m.index;
    const end = m.index + m[0].length;
    const before = text.slice(Math.max(0, start - 25), start);
    const after = text.slice(end, end + 30);

    if (EXPERIENCE_AFTER.test(after) || QUALIFIER_BEFORE.test(before)) {
      candidates.push(n);
    }
  }

  if (candidates.length === 0) return 0;
  return Math.min(...candidates);
}

function matchResumeToJob(resume, jobDescription) {
  const jdText = (jobDescription || '').trim();
  if (!jdText) {
    return {
      score: 0,
      matchedSkills: [],
      missingSkills: [],
      extraSkills: resume.skills || [],
      matchedKeywords: [],
      missingKeywords: [],
      experience: { required: 0, candidate: resume.experienceYears || 0, meets: true },
      suggestions: ['Add a job description to scan against.'],
    };
  }

  // -- Skills comparison --------------------------------------------------
  const jdSkills = extractSkills(jdText).map((s) => String(s).trim().toLowerCase());
  const resumeSkills = Array.from(
    new Set(
      (resume.skills || [])
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean)
    )
  );

  const jdSkillSet = new Set(jdSkills);
  const resumeSkillSet = new Set(resumeSkills);

  const matchedSkills = jdSkills.filter((s) => resumeSkillSet.has(s));
  const missingSkills = jdSkills.filter((s) => !resumeSkillSet.has(s));
  const extraSkills = resumeSkills.filter((s) => !jdSkillSet.has(s));

  // -- Location comparison -----------------------------------------------
  const resumeLocation = String(resume.location || '').trim();
  const jobLocation = extractJobLocation(jdText);
  const locationMatch =
    resumeLocation && jobLocation
      ? resumeLocation.toLowerCase() === jobLocation.toLowerCase()
      : false;

  const resumeTitle = String(resume.position || '').trim();
  const jobTitle = extractJobTitle(jdText);
  const titleMatch =
    resumeTitle && jobTitle
      ? resumeTitle.toLowerCase() === jobTitle.toLowerCase()
      : false;

  // -- Keyword comparison (meaningful nouns/verbs from the JD) ------------
  const jdKeywords = extractKeywords(jdText).filter(
    (k) => !jdSkillSet.has(k) // already counted in skills
  );
  const resumeText = (resume.rawText || '').toLowerCase();
  const matchedKeywords = jdKeywords.filter((k) => resumeText.includes(k));
  const missingKeywords = jdKeywords.filter((k) => !resumeText.includes(k));

  // -- Experience comparison ---------------------------------------------
  const requiredYears = extractRequiredYears(jdText);
  const candidateYears = resume.experienceYears || 0;
  const meetsExperience = requiredYears === 0 || candidateYears >= requiredYears;

  // -- Sub-scores --------------------------------------------------------
  const skillsScore =
    jdSkills.length === 0
      ? 100
      : (matchedSkills.length / jdSkills.length) * 100;

  const keywordsScore =
    jdKeywords.length === 0
      ? 100
      : (matchedKeywords.length / jdKeywords.length) * 100;

  let expScore;
  if (requiredYears === 0) {
    expScore = 100;
  } else if (meetsExperience) {
    expScore = 100;
  } else {
    expScore = Math.max(0, (candidateYears / requiredYears) * 100);
  }

  const finalScore = Math.round(
    0.6 * skillsScore + 0.3 * keywordsScore + 0.1 * expScore
  );

  // -- Suggestions -------------------------------------------------------
  const suggestions = [];
  if (missingSkills.length) {
    const top = missingSkills.slice(0, 6).join(', ');
    suggestions.push(
      `Mention these missing skills if you have them: ${top}.`
    );
  }
  if (!meetsExperience) {
    suggestions.push(
      `Job asks for ${requiredYears}+ years; resume shows ${candidateYears}. Highlight relevant experience.`
    );
  }
  if (missingKeywords.length >= 5) {
    suggestions.push(
      `Try to naturally include keywords like: ${missingKeywords
        .slice(0, 5)
        .join(', ')}.`
    );
  }
  if (finalScore >= 80) {
    suggestions.push('Strong match — your resume is well aligned with this role.');
  } else if (finalScore >= 50) {
    suggestions.push('Decent match. Tailor a few bullet points to push above 80%.');
  } else {
    suggestions.push('Low match. Consider customising the resume for this role.');
  }

  return {
    score: finalScore,
    breakdown: {
      skillsScore: Math.round(skillsScore),
      keywordsScore: Math.round(keywordsScore),
      experienceScore: Math.round(expScore),
    },
    matchedSkills,
    missingSkills,
    extraSkills,
    matchedKeywords: matchedKeywords.slice(0, 15),
    missingKeywords: missingKeywords.slice(0, 15),
    location: {
      resume: resumeLocation,
      job: jobLocation,
      matches: locationMatch,
    },
    jobTitle: {
      resume: resumeTitle,
      job: jobTitle,
      matches: titleMatch,
    },
    experience: {
      required: requiredYears,
      candidate: candidateYears,
      meets: meetsExperience,
    },
    suggestions,
  };
}

module.exports = {
  matchResumeToJob,
  extractKeywords,
  extractRequiredYears,
};
