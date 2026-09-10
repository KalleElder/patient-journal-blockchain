const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const Database = require('better-sqlite3');

const dbPath = path.resolve(
  __dirname,
  '../../../',
  process.env.DB_PATH || 'database/patient_journal.db',
);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

module.exports = db;
