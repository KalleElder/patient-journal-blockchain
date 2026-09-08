-- SQLite-schema för Patient Journal Blockchain.
-- Körs av server/src/db/init.js via `npm run db:init`.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('DOCTOR', 'NURSE', 'CARE_CENTER', 'PATIENT')),
  patient_id INTEGER REFERENCES patients(id),
  -- PATIENT-användare ska ha en kopplad patient, övriga roller ska inte ha det.
  CHECK ((role = 'PATIENT') = (patient_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  author_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('PRIVATE', 'STAFF', 'ALL')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
