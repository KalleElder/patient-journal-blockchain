// Initierar databasen från grunden: skapar tabellerna i database/schema.sql
// och lägger in testdata från database/seed.sql. Körs med `npm run db:init`.
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

const dbPath = path.resolve(
  __dirname,
  '../../../',
  process.env.DB_PATH || 'database/patient_journal.db',
);

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = require('./index');
const databaseDir = path.resolve(__dirname, '../../../database');

db.exec(fs.readFileSync(path.join(databaseDir, 'schema.sql'), 'utf8'));
db.exec(fs.readFileSync(path.join(databaseDir, 'seed.sql'), 'utf8'));

console.log(`Databas initierad: ${dbPath}`);
db.close();
