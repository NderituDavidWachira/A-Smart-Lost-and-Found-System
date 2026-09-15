const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lostfound",
  waitForConnections: true,
  connectionLimit: 10,
});

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_type VARCHAR(10) NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    location VARCHAR(150) NOT NULL,
    date_occurred VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    image_url VARCHAR(500),
    reporter_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id)
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    claimant_id INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    proof_notes TEXT,
    token_of_appreciation VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (claimant_id) REFERENCES users(id)
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    message VARCHAR(300) NOT NULL,
    item_id INT,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  ) ENGINE=InnoDB`,

  // A "thread" is identified by (item_id, the two participant ids). There's
  // no separate conversations table — threads are derived from distinct
  // (item_id, sender/recipient) pairs in this table, since a lost item can
  // have several different people each claiming to have found it, and each
  // of those is its own private thread with the reporter.
  `CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    body TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id),
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id)
  ) ENGINE=InnoDB`,
];

// Adds columns that were introduced after a database may already have been
// created, so existing installs don't need to be dropped and recreated.
const MIGRATIONS = [
  {
    table: "items",
    column: "image_url",
    ddl: "ALTER TABLE items ADD COLUMN image_url VARCHAR(500)",
  },
];

async function runMigrations(conn) {
  for (const { table, column, ddl } of MIGRATIONS) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) c FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, column]
    );
    if (rows[0].c === 0) {
      await conn.query(ddl);
    }
  }
}

async function initSchema() {
  const conn = await pool.getConnection();
  try {
    for (const statement of SCHEMA) {
      await conn.query(statement);
    }
    await runMigrations(conn);
  } finally {
    conn.release();
  }
}

module.exports = { pool, initSchema };