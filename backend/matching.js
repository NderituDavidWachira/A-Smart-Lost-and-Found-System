const { pool } = require("./db");

const CATEGORIES = ["ID Card", "Books", "Electronics", "Clothing", "Keys", "Bags", "Other"];

// Small set of filler words that shouldn't count as a "match" on their own
// (e.g. two items both containing "the" or "found" isn't a real signal).
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "at", "near", "found",
  "lost", "item", "my", "is", "was", "with", "for", "to", "it", "this",
]);

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function wordsOf(text) {
  return new Set(
    normalize(text)
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  );
}

function countOverlap(a, b) {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

/**
 * Business Logic Module: rule-based matching algorithm.
 *
 * Scoring, in order of importance:
 *  1. Category must match exactly, and the candidate must be the opposite
 *     report type (a lost report only matches open found reports).
 *  2. Exact product-name match is the strongest signal: if the titles are
 *     the same (ignoring case/punctuation) — e.g. both say "Nokia" — that
 *     candidate is boosted to the top regardless of anything else.
 *  3. Otherwise, shared words in the title count far more than shared words
 *     in the description or location, since the title is what the reporter
 *     considered the item's defining name.
 *
 * (Report §2.4.2 / §2.1 — mirrors the University of Nairobi "classification
 * engine" concept, extended with title weighting and exact-name detection.)
 */
async function runMatchingEngine(newItem) {
  const oppositeType = newItem.item_type === "lost" ? "found" : "lost";

  const [candidates] = await pool.query(
    `SELECT * FROM items WHERE item_type = ? AND category = ? AND status = 'open'`,
    [oppositeType, newItem.category]
  );

  const newTitleNorm = normalize(newItem.title);
  const newTitleWords = wordsOf(newItem.title);
  const newDescWords = wordsOf(`${newItem.description} ${newItem.location}`);

  const scored = candidates
    .map((c) => {
      const cTitleNorm = normalize(c.title);
      const cTitleWords = wordsOf(c.title);
      const cDescWords = wordsOf(`${c.description} ${c.location}`);

      const exactNameMatch = newTitleNorm.length > 0 && newTitleNorm === cTitleNorm;
      const titleOverlap = countOverlap(newTitleWords, cTitleWords);
      const descOverlap = countOverlap(newDescWords, cDescWords);

      // Title words count 3x, description/location words count 1x, and an
      // exact name match gets a large flat bonus so it always sorts first.
      const score = (exactNameMatch ? 100 : 0) + titleOverlap * 3 + descOverlap;

      return { item: c, score, exactNameMatch, titleOverlap, descOverlap };
    })
    .filter((m) => m.exactNameMatch || m.titleOverlap >= 1 || m.descOverlap >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  for (const { item: c, exactNameMatch } of scored) {
    const strength = exactNameMatch ? "an exact name match" : "a likely match";
    await pool.query(
      `INSERT INTO notifications (user_id, message, item_id) VALUES (?, ?, ?)`,
      [
        newItem.reporter_id,
        `${strength === "an exact name match" ? "Exact match" : "Possible match"} for your ${newItem.item_type} '${newItem.title}': a ${c.item_type} '${c.title}' was reported near ${c.location}.`,
        c.id,
      ]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, message, item_id) VALUES (?, ?, ?)`,
      [
        c.reporter_id,
        `${strength === "an exact name match" ? "Exact match" : "Possible match"} for your ${c.item_type} '${c.title}': a ${newItem.item_type} '${newItem.title}' was reported near ${newItem.location}.`,
        newItem.id,
      ]
    );
  }

  return scored;
}

module.exports = { CATEGORIES, runMatchingEngine };