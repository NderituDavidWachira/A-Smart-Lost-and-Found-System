const { pool } = require("./db");

const CATEGORIES = ["ID Card", "Books", "Electronics", "Clothing", "Keys", "Bags", "Other"];

function wordsOf(item) {
  return new Set(
    `${item.title} ${item.description} ${item.location}`
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
  );
}

/**
 * Business Logic Module: rule-based matching algorithm.
 * Compares a newly reported item against open, opposite-type items in the
 * same category and notifies both parties of likely matches
 * (report §2.4.2 / §2.1 — mirrors the University of Nairobi "classification
 * engine" concept).
 */
async function runMatchingEngine(newItem) {
  const oppositeType = newItem.item_type === "lost" ? "found" : "lost";

  const [candidates] = await pool.query(
    `SELECT * FROM items WHERE item_type = ? AND category = ? AND status = 'open'`,
    [oppositeType, newItem.category]
  );

  const newWords = wordsOf(newItem);
  const scored = candidates
    .map((c) => {
      const overlap = [...wordsOf(c)].filter((w) => newWords.has(w));
      return { item: c, score: overlap.length };
    })
    .filter((m) => m.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  for (const { item: c } of scored) {
    await pool.query(
      `INSERT INTO notifications (user_id, message, item_id) VALUES (?, ?, ?)`,
      [
        newItem.reporter_id,
        `Possible match for your ${newItem.item_type} '${newItem.title}': a ${c.item_type} '${c.title}' was reported near ${c.location}.`,
        c.id,
      ]
    );
    await pool.query(
      `INSERT INTO notifications (user_id, message, item_id) VALUES (?, ?, ?)`,
      [
        c.reporter_id,
        `Possible match for your ${c.item_type} '${c.title}': a ${newItem.item_type} '${newItem.title}' was reported near ${newItem.location}.`,
        newItem.id,
      ]
    );
  }

  return scored;
}

module.exports = { CATEGORIES, runMatchingEngine };
