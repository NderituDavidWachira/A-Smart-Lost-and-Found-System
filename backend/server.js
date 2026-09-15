/**
 * St. Paul's University Lost & Found Management System
 * Backend API — Node.js + Express + MySQL (mysql2) + JWT
 *
 * Implements the modules described in the project design:
 * - Authentication & Authorization Module (JWT-based)
 * - Database Management Module (MySQL via mysql2/promise, connection pool)
 * - Business Logic Module (categorisation, matching algorithm, claims) -> matching.js
 * - Notification Module (in-app notification feed; email/SMS hooks stubbed)
 * - Admin & User Management Module (verification dashboard, stats)
 *
 * NOTE: Admin accounts are NOT created through this API. There is
 * intentionally no admin signup path here — the single admin account is
 * created directly in the database via scripts/create-admin.js.
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const multer = require("multer");
require("dotenv").config({ quiet: true });

const { pool, initSchema } = require("./db");
const { CATEGORIES, runMatchingEngine } = require("./matching");
const { signToken, requireAuth, requireAdmin } = require("./auth");
const { userOut, itemOut, itemsOut, claimOut, claimsOut, notificationOut, messageOut } = require("./serializers");
const { listMyConversations, listAllConversations } = require("./conversations");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// ---------------------------------------------------------------------------
// Image uploads: stored on disk under backend/uploads, served statically at
// /uploads/<filename>. Only image files up to 5MB are accepted.
// ---------------------------------------------------------------------------

const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Wrap async route handlers so thrown errors reach Express's error handler
// instead of crashing the process.
const ah = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.post(
  "/api/register",
  ah(async (req, res) => {
    const { name, email, password, phone } = req.body || {};
    for (const [field, value] of Object.entries({ name, email, password })) {
      if (!value) return res.status(400).json({ error: `${field} is required` });
    }

    const [[existing]] = await pool.query(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);

    const [info] = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'student')`,
      [name, email, phone || "", passwordHash]
    );

    const [[user]] = await pool.query(`SELECT * FROM users WHERE id = ?`, [info.insertId]);
    const token = signToken(user);
    res.status(201).json({ token, user: userOut(user) });
  })
);

app.post(
  "/api/forgot-password",
  ah(async (req, res) => {
    const { email, phone, new_password } = req.body || {};
    for (const [field, value] of Object.entries({ email, phone, new_password })) {
      if (!value) return res.status(400).json({ error: `${field} is required` });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const [[user]] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email]);
    const phoneMatches = user && (user.phone || "").trim() === phone.trim() && phone.trim() !== "";

    if (!user || !phoneMatches) {
      return res.status(404).json({
        error: "No account found matching that email and phone number.",
      });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, user.id]);

    res.json({ message: "Password updated. You can now log in with your new password." });
  })
);

app.post(
  "/api/login",
  ah(async (req, res) => {
    const { email, password } = req.body || {};
    const [[user]] = await pool.query(`SELECT * FROM users WHERE email = ?`, [email || ""]);
    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = signToken(user);
    res.json({ token, user: userOut(user) });
  })
);

app.get(
  "/api/me",
  requireAuth,
  ah(async (req, res) => {
    const [[user]] = await pool.query(`SELECT * FROM users WHERE id = ?`, [req.userId]);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(userOut(user));
  })
);

// ---------------------------------------------------------------------------
// Item routes
// ---------------------------------------------------------------------------

app.get("/api/categories", (req, res) => res.json(CATEGORIES));

app.get(
  "/api/items",
  ah(async (req, res) => {
    const { type, category, q, status } = req.query;
    let sql = `SELECT * FROM items WHERE 1=1`;
    const params = [];

    if (type) {
      sql += ` AND item_type = ?`;
      params.push(type);
    }
    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    if (status) {
      const statuses = status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length === 1) {
        sql += ` AND status = ?`;
        params.push(statuses[0]);
      } else if (statuses.length > 1) {
        sql += ` AND status IN (${statuses.map(() => "?").join(",")})`;
        params.push(...statuses);
      }
    }
    if (q) {
      sql += ` AND (title LIKE ? OR description LIKE ? OR location LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    sql += ` ORDER BY created_at DESC`;

    const [items] = await pool.query(sql, params);
    res.json(await itemsOut(items));
  })
);

app.post(
  "/api/items",
  requireAuth,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  ah(async (req, res) => {
    const { item_type, category, title, description, location, date_occurred } = req.body || {};
    for (const [field, value] of Object.entries({ item_type, category, title, location, date_occurred })) {
      if (!value) return res.status(400).json({ error: `${field} is required` });
    }
    if (!["lost", "found"].includes(item_type)) {
      return res.status(400).json({ error: "item_type must be 'lost' or 'found'" });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "invalid category" });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [info] = await pool.query(
      `INSERT INTO items (item_type, category, title, description, location, date_occurred, reporter_id, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item_type, category, title, description || "", location, date_occurred, req.userId, imageUrl]
    );

    const [[item]] = await pool.query(`SELECT * FROM items WHERE id = ?`, [info.insertId]);
    const matches = await runMatchingEngine(item);

    res.status(201).json({ ...(await itemOut(item)), match_count: matches.length });
  })
);

app.get(
  "/api/items/:id",
  ah(async (req, res) => {
    const [[item]] = await pool.query(`SELECT * FROM items WHERE id = ?`, [req.params.id]);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(await itemOut(item));
  })
);

// Admin: Mark an item as returned directly
app.post(
  "/api/admin/items/:id/return",
  requireAuth,
  requireAdmin,
  ah(async (req, res) => {
    const [[item]] = await pool.query(`SELECT * FROM items WHERE id = ?`, [req.params.id]);
    if (!item) return res.status(404).json({ error: "Item not found" });

    await pool.query(`UPDATE items SET status = 'returned' WHERE id = ?`, [item.id]);

    await pool.query(
      `INSERT INTO notifications (user_id, message, item_id) VALUES (?, ?, ?)`,
      [item.reporter_id, `Your item '${item.title}' has been marked as returned by admin.`, item.id]
    );

    const [[updated]] = await pool.query(`SELECT * FROM items WHERE id = ?`, [item.id]);
    res.json(await itemOut(updated));
  })
);

// ---------------------------------------------------------------------------
// Claims (verification workflow + token of appreciation)
// ---------------------------------------------------------------------------

app.post(
  "/api/items/:id/claim",
  requireAuth,
  ah(async (req, res) => {
    const [[item]] = await pool.query(`SELECT * FROM items WHERE id = ?`, [req.params.id]);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const { proof_notes, token_of_appreciation } = req.body || {};

    const [info] = await pool.query(
      `INSERT INTO claims (item_id, claimant_id, proof_notes, token_of_appreciation)
       VALUES (?, ?, ?, ?)`,
      [item.id, req.userId, proof_notes || "", token_of_appreciation || ""]
    );

    await pool.query(`UPDATE items SET status = 'claimed' WHERE id = ?`, [item.id]);
    await pool.query(
      `INSERT INTO notifications (user_id, message, item_id) VALUES (?, ?, ?)`,
      [item.reporter_id, `Someone has claimed the item '${item.title}'. Awaiting admin verification.`, item.id]
    );

    const [[claim]] = await pool.query(`SELECT * FROM claims WHERE id = ?`, [info.insertId]);
    res.status(201).json(await claimOut(claim));
  })
);

app.get(
  "/api/admin/claims",
  requireAuth,
  requireAdmin,
  ah(async (req, res) => {
    const status = req.query.status || "pending";
    const [claims] =
      status === "all"
        ? await pool.query(`SELECT * FROM claims ORDER BY created_at DESC`)
        : await pool.query(`SELECT * FROM claims WHERE status = ? ORDER BY created_at DESC`, [status]);
    res.json(await claimsOut(claims));
  })
);

app.post(
  "/api/admin/claims/:id/decide",
  requireAuth,
  requireAdmin,
  ah(async (req, res) => {
    const { decision } = req.body || {};
    if (!["verified", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'verified' or 'rejected'" });
    }

    const [[claim]] = await pool.query(`SELECT * FROM claims WHERE id = ?`, [req.params.id]);
    if (!claim) return res.status(404).json({ error: "Claim not found" });

    const [[item]] = await pool.query(`SELECT * FROM items WHERE id = ?`, [claim.item_id]);

    await pool.query(`UPDATE claims SET status = ? WHERE id = ?`, [decision, claim.id]);

    if (decision === "verified") {
      await pool.query(`UPDATE items SET status = 'returned' WHERE id = ?`, [item.id]);
      await pool.query(
        `INSERT INTO notifications (user_id, message, item_id) VALUES (?, ?, ?)`,
        [claim.claimant_id, `Your claim for '${item.title}' was verified. The item has been marked as returned.`, item.id]
      );
    } else {
      await pool.query(`UPDATE items SET status = 'open' WHERE id = ?`, [item.id]);
      await pool.query(
        `INSERT INTO notifications (user_id, message, item_id) VALUES (?, ?, ?)`,
        [claim.claimant_id, `Your claim for '${item.title}' could not be verified. The item is open for other claims.`, item.id]
      );
    }
    await pool.query(
      `INSERT INTO notifications (user_id, message, item_id) VALUES (?, ?, ?)`,
      [item.reporter_id, `Item '${item.title}' claim was ${decision} by admin.`, item.id]
    );

    const [[updated]] = await pool.query(`SELECT * FROM claims WHERE id = ?`, [claim.id]);
    res.json(await claimOut(updated));
  })
);

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

async function fetchMessageRow(sql, params) {
  const [[row]] = await pool.query(sql, params);
  return row;
}

app.post(
  "/api/items/:id/messages",
  requireAuth,
  ah(async (req, res) => {
    const [[item]] = await pool.query(`SELECT * FROM items WHERE id = ?`, [req.params.id]);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const { body } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: "Message body is required" });

    let toUserId = req.body.to_user_id ? Number(req.body.to_user_id) : null;

    if (!toUserId) {
      if (req.userId === item.reporter_id) {
        return res.status(400).json({ error: "to_user_id is required when replying as the item's reporter" });
      }
      toUserId = item.reporter_id;
    }

    if (toUserId === req.userId) {
      return res.status(400).json({ error: "You can't message yourself" });
    }

    const isFirstMessage = !(await fetchMessageRow(
      `SELECT id FROM messages WHERE item_id = ? AND
       ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)) LIMIT 1`,
      [item.id, req.userId, toUserId, toUserId, req.userId]
    ));

    const [info] = await pool.query(
      `INSERT INTO messages (item_id, sender_id, recipient_id, body) VALUES (?, ?, ?, ?)`,
      [item.id, req.userId, toUserId, body.trim()]
    );

    const [[sender]] = await pool.query(`SELECT name FROM users WHERE id = ?`, [req.userId]);
    const notifMessage = isFirstMessage
      ? `${sender.name} thinks they found your lost item '${item.title}'. Open Messages to chat.`
      : `New message from ${sender.name} about '${item.title}'.`;
    await pool.query(`INSERT INTO notifications (user_id, message, item_id) VALUES (?, ?, ?)`, [
      toUserId,
      notifMessage,
      item.id,
    ]);

    const [[row]] = await pool.query(
      `SELECT m.*, s.name AS sender_name, r.name AS recipient_name
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       JOIN users r ON r.id = m.recipient_id
       WHERE m.id = ?`,
      [info.insertId]
    );
    res.status(201).json(messageOut(row));
  })
);

app.get(
  "/api/items/:id/messages",
  requireAuth,
  ah(async (req, res) => {
    const [[item]] = await pool.query(`SELECT * FROM items WHERE id = ?`, [req.params.id]);
    if (!item) return res.status(404).json({ error: "Item not found" });

    let withUserId = req.query.with ? Number(req.query.with) : null;

    if (!withUserId) {
      const [counterparts] = await pool.query(
        `SELECT DISTINCT CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS counterpart_id
         FROM messages WHERE item_id = ? AND (sender_id = ? OR recipient_id = ?)`,
        [req.userId, item.id, req.userId, req.userId]
      );
      if (counterparts.length === 1) {
        withUserId = counterparts[0].counterpart_id;
      } else if (counterparts.length === 0) {
        return res.json([]);
      } else {
        return res.status(400).json({ error: "Multiple threads on this item — specify ?with=<userId>" });
      }
    }

    const [rows] = await pool.query(
      `SELECT m.*, s.name AS sender_name, r.name AS recipient_name
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       JOIN users r ON r.id = m.recipient_id
       WHERE m.item_id = ? AND ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
       ORDER BY m.created_at ASC`,
      [item.id, req.userId, withUserId, withUserId, req.userId]
    );

    if (rows.length === 0) return res.json([]);

    await pool.query(
      `UPDATE messages SET is_read = 1 WHERE item_id = ? AND sender_id = ? AND recipient_id = ? AND is_read = 0`,
      [item.id, withUserId, req.userId]
    );

    res.json(rows.map(messageOut));
  })
);

app.get(
  "/api/conversations",
  requireAuth,
  ah(async (req, res) => {
    res.json(await listMyConversations(req.userId));
  })
);

app.get(
  "/api/admin/conversations",
  requireAuth,
  requireAdmin,
  ah(async (req, res) => {
    res.json(await listAllConversations());
  })
);

app.get(
  "/api/admin/items/:id/messages",
  requireAuth,
  requireAdmin,
  ah(async (req, res) => {
    const userA = Number(req.query.a);
    const userB = Number(req.query.b);
    if (!userA || !userB) return res.status(400).json({ error: "?a=<userId>&b=<userId> are required" });

    const [rows] = await pool.query(
      `SELECT m.*, s.name AS sender_name, r.name AS recipient_name
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       JOIN users r ON r.id = m.recipient_id
       WHERE m.item_id = ? AND ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))
       ORDER BY m.created_at ASC`,
      [req.params.id, userA, userB, userB, userA]
    );
    res.json(rows.map(messageOut));
  })
);

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

app.get(
  "/api/notifications",
  requireAuth,
  ah(async (req, res) => {
    const [notes] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(notes.map(notificationOut));
  })
);

app.post(
  "/api/notifications/:id/read",
  requireAuth,
  ah(async (req, res) => {
    const [[note]] = await pool.query(`SELECT * FROM notifications WHERE id = ?`, [req.params.id]);
    if (!note) return res.status(404).json({ error: "Notification not found" });
    if (note.user_id !== req.userId) return res.status(403).json({ error: "forbidden" });

    await pool.query(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [note.id]);
    const [[updated]] = await pool.query(`SELECT * FROM notifications WHERE id = ?`, [note.id]);
    res.json(notificationOut(updated));
  })
);

// ---------------------------------------------------------------------------
// Admin dashboard / analytics
// ---------------------------------------------------------------------------

app.get(
  "/api/admin/stats",
  requireAuth,
  requireAdmin,
  ah(async (req, res) => {
    const [[{ c: total }]] = await pool.query(`SELECT COUNT(*) c FROM items`);
    const [[{ c: returned }]] = await pool.query(`SELECT COUNT(*) c FROM items WHERE status = 'returned'`);
    const [[{ c: lost }]] = await pool.query(`SELECT COUNT(*) c FROM items WHERE item_type = 'lost'`);
    const [[{ c: found }]] = await pool.query(`SELECT COUNT(*) c FROM items WHERE item_type = 'found'`);
    const [[{ c: pendingClaims }]] = await pool.query(`SELECT COUNT(*) c FROM claims WHERE status = 'pending'`);
    const [[{ c: totalUsers }]] = await pool.query(`SELECT COUNT(*) c FROM users`);

    const byCategory = {};
    for (const cat of CATEGORIES) {
      const [[{ c }]] = await pool.query(`SELECT COUNT(*) c FROM items WHERE category = ?`, [cat]);
      byCategory[cat] = c;
    }

    res.json({
      total_items: total,
      lost_items: lost,
      found_items: found,
      returned_items: returned,
      recovery_rate: total ? Math.round((returned / total) * 1000) / 10 : 0,
      pending_claims: pendingClaims,
      by_category: byCategory,
      total_users: totalUsers,
    });
  })
);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

initSchema()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Lost & Found API listening on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialise database schema:", err);
    process.exit(1);
  });