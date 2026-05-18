const sqlite3 = require('sqlite3').verbose();
const path = require('node:path');

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'contacts.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database error:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      avatar TEXT,
      firstName TEXT,
      lastName TEXT,
      otherNames TEXT,
      relation TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      notes TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      postalCode TEXT
    )
  `);
});

module.exports = db;
