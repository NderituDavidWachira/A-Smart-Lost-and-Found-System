/**
 * One-time script to create the single admin account directly in the
 * database. Admin signup is intentionally NOT exposed through the public
 * /api/register endpoint or the frontend — this is the only way to create
 * an admin.
 *
 * Usage (from the backend/ folder):
 *   node scripts/create-admin.js "Admin Name" admin@spu.ac.ke a-strong-password "0700000000"
 *
 * Phone number is optional.
 */
const bcrypt = require("bcryptjs");
const { pool } = require("../db");

async function main() {
  const [name, email, password, phone] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error("Usage: node scripts/create-admin.js <name> <email> <password> [phone]");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const [[existingAdmin]] = await pool.query(`SELECT id, email FROM users WHERE role = 'admin'`);
  if (existingAdmin) {
    console.error(
      `An admin account already exists (${existingAdmin.email}). This system only allows one admin.`
    );
    process.exit(1);
  }

  const [[existingEmail]] = await pool.query(`SELECT id FROM users WHERE email = ?`, [email]);
  if (existingEmail) {
    console.error(`That email is already registered as a non-admin user. Choose a different email.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, 'admin')`,
    [name, email, phone || "", passwordHash]
  );

  console.log(`Admin account created: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to create admin:", err.message);
  process.exit(1);
});