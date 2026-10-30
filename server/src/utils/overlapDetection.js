/**
 * CaseLink AI — Enhanced NLP Overlap Detection Engine
 * ====================================================
 * Combines four signal layers to detect related/duplicate complaints:
 *
 *  Layer 1 — Institution Matching   (AICTE ID exact + fuzzy name match)
 *  Layer 2 — TF-IDF Cosine Similarity on complaint descriptions
 *  Layer 3 — Rule-based Category & Timeline signals
 *  Layer 4 — Weighted ensemble → Relationship classification
 *
 * Relationship Types (from CaseLink AI specification):
 *  - DUPLICATE          Score ≥ 0.85   Same complaint re-submitted
 *  - RELATED            Score ≥ 0.60   Same issue, different bureau
 *  - SAME_INST_DIFF     Score ≥ 0.40   Same institution, unrelated issue
 *  - CONFLICTING_ACTION Score trigger  Bureaus taking contradictory actions
 *
 * Human-in-the-Loop: all matches are suggestions; reviewers confirm/reject.
 */

'use strict';

const natural = require('natural');
const stringSimilarity = require('string-similarity');
const { distance: levenshtein } = require('fastest-levenshtein');
const Complaint = require('../models/Complaint');
const logger = require('./logger');

// ─── NLP Utilities ────────────────────────────────────────────────────────────

const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

/** STOP_WORDS for Indian legal/admin domain */
const STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should',
  'may','might','shall','can','need','must','ought','used','to','of',
  'in','on','at','for','with','about','against','between','into',
  'through','during','before','after','above','below','from','by',
  'and','or','but','if','as','until','while','that','which','who',
  'whom','this','these','those','i','we','you','he','she','they',
  'it','its','my','our','your','his','her','their','not','no','nor',
  'so','yet','both','either','neither','said','institution','college',
  'aicte','complaint','grievance','case','sir','dear','please','kindly',
  'student','faculty','regarding','hereby','above','mentioned','attached',
]);

/**
 * Preprocess text: tokenize, lowercase, remove stopwords, stem
 * @param {string} text
 * @returns {string[]} processed tokens
 */
function preprocess(text) {
  if (!text || typeof text !== 'string') return [];
  return tokenizer
    .tokenize(text.toLowerCase())
    .filter(t => t.length > 2 && !STOP_WORDS.has(t) && /^[a-z]+$/.test(t))
    .map(t => stemmer.stem(t));
}

// ─── TF-IDF Engine ────────────────────────────────────────────────────────────

/** Build term-frequency map for a single document */
function buildTF(tokens) {
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  const total = tokens.length || 1;
  for (const t in tf) tf[t] /= total;
  return tf;
}

/**
 * Compute TF-IDF cosine similarity between two complaint texts.
 * Uses a tiny in-memory IDF based on just the two documents.
 * @returns {number} 0.0–1.0
 */
function tfidfCosineSimilarity(textA, textB) {
  const tokensA = preprocess(textA);
  const tokensB = preprocess(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const tfA = buildTF(tokensA);
  const tfB = buildTF(tokensB);

  // IDF: log(2 / (docs containing term + 1)) — simple 2-doc IDF
  const vocab = new Set([...Object.keys(tfA), ...Object.keys(tfB)]);
  const idf = {};
  for (const term of vocab) {
    const df = (term in tfA ? 1 : 0) + (term in tfB ? 1 : 0);
    idf[term] = Math.log(3 / (df + 1)) + 1; // smoothed
  }

  // TF-IDF vectors
  const vecA = {}, vecB = {};
  for (const term of vocab) {
    vecA[term] = (tfA[term] || 0) * idf[term];
    vecB[term] = (tfB[term] || 0) * idf[term];
  }

  // Cosine similarity
  let dot = 0, magA = 0, magB = 0;
  for (const term of vocab) {
    dot  += vecA[term] * vecB[term];
    magA += vecA[term] ** 2;
    magB += vecB[term] ** 2;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : Math.min(dot / denom, 1.0);
}

// ─── Institution Name Fuzzy Matcher ───────────────────────────────────────────

/** Normalize institution name for comparison */
function normalizeInstName(name = '') {
  return name
    .toLowerCase()
    .replace(/\b(of|and|the|institute|college|university|school|academy|centre|center|polytechnic|engineering|technology|science|management|studies|arts|commerce)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fuzzy institution name similarity.
 * Returns 0.0–1.0 (1.0 = identical after normalization)
 */
function institutionNameSimilarity(nameA, nameB) {
  if (!nameA || !nameB) return 0;
  const nA = normalizeInstName(nameA);
  const nB = normalizeInstName(nameB);
  if (nA === nB) return 1.0;
  // Dice coefficient (string-similarity)
  const dice = stringSimilarity.compareTwoStrings(nA, nB);
  // Levenshtein ratio
  const maxLen = Math.max(nA.length, nB.length);
  const levRatio = maxLen === 0 ? 1 : 1 - levenshtein(nA, nB) / maxLen;
  return Math.max(dice, levRatio);
}

// ─── Signal Extractors ────────────────────────────────────────────────────────

/** Extract monetary amounts from text */
function extractAmounts(text = '') {
  const matches = text.match(/(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d+)?(?:\s*(?:lakhs?|lacs?|crores?|thousands?))?/gi) || [];
  return matches.map(m => m.replace(/[^0-9.]/g, '').trim());
}

/** Extract dates from text (rough) */
function extractDates(text = '') {
  return (text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\b/gi) || [])
    .map(d => d.toLowerCase());
}

/** Check whether two complaints involve contradictory statuses */
function isConflictingAction(statusA, statusB) {
  const pairs = [
    ['Disposed', 'Escalated'],
    ['Closed',   'Escalated'],
    ['Disposed', 'Transferred'],
    ['Rejected', 'Under Process'],
  ];
  return pairs.some(([x, y]) =>
    (statusA === x && statusB === y) || (statusA === y && statusB === x)
  );
}

// ─── Relationship Classifier ─────────────────────────────────────────────────

/**
 * Classify the relationship between two complaints given their signals.
 * @returns {{ type, score, evidence }}
 */
function classifyRelationship({ textSim, categorySame, bureauDiff, statusConflict, amountOverlap, daysDiff }) {
  const evidence = [];

  // ── Evidence strings ──
  if (textSim > 0.3) evidence.push(`Description similarity: ${(textSim * 100).toFixed(0)}%`);
  if (categorySame)  evidence.push('Same complaint category');
  if (bureauDiff)    evidence.push('Handled by different Bureaus/Cells');
  if (statusConflict)evidence.push('Conflicting action statuses detected');
  if (amountOverlap) evidence.push('Similar monetary amounts mentioned');
  if (daysDiff !== null && daysDiff <= 30) evidence.push(`Received within ${daysDiff} day(s) of each other`);

  // ── Weighted composite score ──
  let score = 0;
  score += textSim          * 0.50;  // 50% — description similarity (TF-IDF)
  score += (categorySame ? 1 : 0) * 0.20;  // 20% — same category
  score += (bureauDiff   ? 1 : 0) * 0.15;  // 15% — different bureau = overlap risk
  score += (amountOverlap? 1 : 0) * 0.10;  //  10% — same amounts
  score += (daysDiff !== null && daysDiff <= 14 ? 0.05 : 0); //  5% — close dates
  score = Math.min(score, 1.0);

  // ── Classification ──
  let type;
  if (statusConflict) {
    type = 'CONFLICTING_ACTION';
  } else if (score >= 0.82) {
    type = 'DUPLICATE';
  } else if (score >= 0.58) {
    type = 'RELATED';
  } else if (score >= 0.35) {
    type = 'SAME_INST_DIFF_ISSUE';
  } else {
    type = 'UNRELATED';
  }

  return { type, score: parseFloat(score.toFixed(4)), evidence };
}

// ─── Main Detection Engine ───────────────────────────────────────────────────

/**
 * Detect overlapping/related complaints for a newly registered complaint.
 *
 * @param {Object} newComplaint - Mongoose complaint document
 * @returns {Promise<Array>} Array of { complaint, relationship }
 */
async function detectOverlaps(newComplaint) {
  try {
    // Find candidate complaints: same institution, still active, not terminal
    const candidates = await Complaint.find({
      _id: { $ne: newComplaint._id },
      institution: newComplaint.institution,
      isActive: true,
      status: { $nin: ['Disposed', 'Closed', 'Rejected'] },
    })
      .populate('assignedBureau', 'code name')
      .select('_id caseId assignedBureau category description status receivedDate');

    if (candidates.length === 0) return [];

    const results = [];

    for (const candidate of candidates) {
      // ── Layer 1: Bureau must differ for overlap risk (same bureau = just related)
      const bureauDiff =
        String(candidate.assignedBureau?._id) !== String(newComplaint.assignedBureau);

      // ── Layer 2: TF-IDF cosine similarity on descriptions
      const textSim = tfidfCosineSimilarity(
        newComplaint.description || '',
        candidate.description   || ''
      );

      // ── Layer 3: Rule-based signals
      const categorySame    = candidate.category === newComplaint.category;
      const statusConflict  = isConflictingAction(newComplaint.status, candidate.status);
      const amountsA        = extractAmounts(newComplaint.description || '');
      const amountsB        = extractAmounts(candidate.description   || '');
      const amountOverlap   = amountsA.length > 0 && amountsB.length > 0 &&
                              amountsA.some(a => amountsB.includes(a));
      const daysDiff        = newComplaint.receivedDate && candidate.receivedDate
        ? Math.abs((new Date(newComplaint.receivedDate) - new Date(candidate.receivedDate)) / 86400000)
        : null;

      // ── Layer 4: Classify
      const relationship = classifyRelationship({
        textSim, categorySame, bureauDiff,
        statusConflict, amountOverlap, daysDiff,
      });

      // Only surface non-trivial relationships
      if (relationship.type !== 'UNRELATED') {
        results.push({ complaint: candidate, relationship });

        // Also back-link: update candidate's overlapFlags
        await Complaint.findByIdAndUpdate(candidate._id, {
          $addToSet: { overlapFlags: newComplaint._id },
          isOverlapReviewed: false,
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.relationship.score - a.relationship.score);

    logger.info(
      `CaseLink AI: ${results.length} overlap(s) found for ${newComplaint.caseId || 'new case'}`
    );

    return results;
  } catch (err) {
    logger.error(`Overlap detection error: ${err.message}`);
    return [];
  }
}

/**
 * Re-run detection for an existing complaint against the full DB.
 * Used by the cron job and the manual "Re-scan" button.
 */
async function rescanComplaint(complaintId) {
  const complaint = await Complaint.findById(complaintId)
    .populate('institution assignedBureau');
  if (!complaint) return [];
  return detectOverlaps(complaint);
}

/**
 * Quick pairwise similarity report between two complaint IDs.
 * Used by the Overlap Alert detail view to show reviewers the evidence.
 */
async function getPairwiseReport(idA, idB) {
  const [cA, cB] = await Promise.all([
    Complaint.findById(idA).populate('assignedBureau institution'),
    Complaint.findById(idB).populate('assignedBureau institution'),
  ]);
  if (!cA || !cB) return null;

  const textSim     = tfidfCosineSimilarity(cA.description || '', cB.description || '');
  const nameSim     = institutionNameSimilarity(
    cA.institution?.name, cB.institution?.name
  );
  const categorySame    = cA.category === cB.category;
  const bureauDiff      = String(cA.assignedBureau?._id) !== String(cB.assignedBureau?._id);
  const statusConflict  = isConflictingAction(cA.status, cB.status);
  const amountOverlap   =
    extractAmounts(cA.description || '').some(a => extractAmounts(cB.description || '').includes(a));
  const daysDiff = cA.receivedDate && cB.receivedDate
    ? Math.abs((new Date(cA.receivedDate) - new Date(cB.receivedDate)) / 86400000)
    : null;

  const relationship = classifyRelationship({
    textSim, categorySame, bureauDiff, statusConflict, amountOverlap, daysDiff,
  });

  return {
    caseA: { id: cA._id, caseId: cA.caseId, bureau: cA.assignedBureau?.code, status: cA.status },
    caseB: { id: cB._id, caseId: cB.caseId, bureau: cB.assignedBureau?.code, status: cB.status },
    signals: {
      textSimilarity:    parseFloat(textSim.toFixed(4)),
      institutionNameSim:parseFloat(nameSim.toFixed(4)),
      categorySame,
      bureauDiff,
      statusConflict,
      amountOverlap,
      daysDiff: daysDiff !== null ? Math.round(daysDiff) : null,
    },
    relationship,
  };
}

// ─── Legacy Jaccard (kept for backward compatibility) ─────────────────────────
const jaccardSimilarity = (s1, s2) => {
  const a = new Set(s1.toLowerCase().split(/\W+/).filter(Boolean));
  const b = new Set(s2.toLowerCase().split(/\W+/).filter(Boolean));
  const inter = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : inter.size / union.size;
};

module.exports = {
  detectOverlaps,
  rescanComplaint,
  getPairwiseReport,
  tfidfCosineSimilarity,
  institutionNameSimilarity,
  jaccardSimilarity,
  normalizeInstName,
  preprocess,
};
