const { pool } = require("./db");

function userOut(u) {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
}

async function itemOut(i) {
  const [[reporter]] = await pool.query(`SELECT name FROM users WHERE id = ?`, [i.reporter_id]);
  return {
    id: i.id,
    item_type: i.item_type,
    category: i.category,
    title: i.title,
    description: i.description,
    location: i.location,
    date_occurred: i.date_occurred,
    status: i.status,
    image_url: i.image_url || null,
    reporter_id: i.reporter_id,
    reporter_name: reporter ? reporter.name : null,
    created_at: i.created_at,
  };
}

async function itemsOut(items) {
  return Promise.all(items.map(itemOut));
}

async function claimOut(c) {
  const [[claimant]] = await pool.query(`SELECT name FROM users WHERE id = ?`, [c.claimant_id]);
  return {
    id: c.id,
    item_id: c.item_id,
    claimant_id: c.claimant_id,
    claimant_name: claimant ? claimant.name : null,
    status: c.status,
    proof_notes: c.proof_notes,
    token_of_appreciation: c.token_of_appreciation,
    created_at: c.created_at,
  };
}

async function claimsOut(claims) {
  return Promise.all(claims.map(claimOut));
}

function notificationOut(n) {
  return {
    id: n.id,
    message: n.message,
    item_id: n.item_id,
    is_read: !!n.is_read,
    created_at: n.created_at,
  };
}

module.exports = { userOut, itemOut, itemsOut, claimOut, claimsOut, notificationOut };