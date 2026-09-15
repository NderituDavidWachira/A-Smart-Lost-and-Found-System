const { pool } = require("./db");

/**
 * A "thread" is (item_id, participant A, participant B) — derived from the
 * messages table itself rather than a separate conversations table, since
 * a single lost item can have several different finders, each messaging
 * the reporter privately.
 */

// Threads involving a specific user (their own inbox).
async function listMyConversations(userId) {
  const [rows] = await pool.query(
    `SELECT item_id,
            CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS counterpart_id,
            MAX(created_at) AS last_at
     FROM messages
     WHERE sender_id = ? OR recipient_id = ?
     GROUP BY item_id, counterpart_id
     ORDER BY last_at DESC`,
    [userId, userId, userId]
  );

  return Promise.all(
    rows.map((row) => enrichConversation(row.item_id, row.counterpart_id, userId))
  );
}

// Every thread system-wide, for admin monitoring — not scoped to a viewer.
async function listAllConversations() {
  const [rows] = await pool.query(
    `SELECT item_id,
            LEAST(sender_id, recipient_id) AS user_a,
            GREATEST(sender_id, recipient_id) AS user_b,
            MAX(created_at) AS last_at,
            COUNT(*) AS message_count
     FROM messages
     GROUP BY item_id, user_a, user_b
     ORDER BY last_at DESC`
  );

  return Promise.all(
    rows.map(async (row) => {
      const base = await enrichConversation(row.item_id, row.user_a, row.user_b);
      return { ...base, message_count: row.message_count };
    })
  );
}

async function enrichConversation(itemId, userA, userB) {
  const [[item]] = await pool.query(
    `SELECT title, item_type, status FROM items WHERE id = ?`,
    [itemId]
  );
  const [[userAInfo]] = await pool.query(`SELECT name FROM users WHERE id = ?`, [userA]);
  const [[userBInfo]] = await pool.query(`SELECT name FROM users WHERE id = ?`, [userB]);
  const [[lastMsg]] = await pool.query(
    `SELECT body, sender_id, created_at FROM messages
     WHERE item_id = ? AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
     ORDER BY created_at DESC LIMIT 1`,
    [itemId, userA, userB, userB, userA]
  );
  const [[{ c: unreadCount }]] = await pool.query(
    `SELECT COUNT(*) c FROM messages
     WHERE item_id = ? AND sender_id = ? AND recipient_id = ? AND is_read = 0`,
    [itemId, userA, userB]
  );

  return {
    item_id: itemId,
    item_title: item ? item.title : null,
    item_type: item ? item.item_type : null,
    item_status: item ? item.status : null,
    user_a_id: userA,
    user_a_name: userAInfo ? userAInfo.name : null,
    user_b_id: userB,
    user_b_name: userBInfo ? userBInfo.name : null,
    last_message: lastMsg ? lastMsg.body : null,
    last_message_sender_id: lastMsg ? lastMsg.sender_id : null,
    last_message_at: lastMsg ? lastMsg.created_at : null,
    unread_count: unreadCount,
  };
}

module.exports = { listMyConversations, listAllConversations };