const db = require('../db');

const STAFF_ROLES = ['DOCTOR', 'NURSE', 'CARE_CENTER'];
const VISIBILITY_VALUES = ['PRIVATE', 'STAFF', 'ALL'];

// Icke-numeriska URL-parametrar (t.ex. /api/patients/abc) kan inte matcha
// någon rad och ska ge 404 i stället för att krascha SQL-bindningen.
function parsePatientId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

function toJournalResponse(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    authorId: row.author_id,
    authorName: row.author_name,
    content: row.content,
    visibility: row.visibility,
    createdAt: row.created_at,
  };
}

function listPatients(req, res) {
  if (!STAFF_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Åtkomst nekad' });
  }

  res.json(db.prepare('SELECT id, name FROM patients').all());
}

function getPatient(req, res) {
  const patientId = parsePatientId(req.params.id);
  if (patientId === null) {
    return res.status(404).json({ error: 'Patienten hittades inte' });
  }

  const { role, patientId: ownPatientId } = req.user;
  if (role === 'PATIENT') {
    if (patientId !== ownPatientId) {
      return res.status(403).json({ error: 'Åtkomst nekad' });
    }
  } else if (!STAFF_ROLES.includes(role)) {
    return res.status(403).json({ error: 'Åtkomst nekad' });
  }

  const patient = db.prepare('SELECT id, name FROM patients WHERE id = ?').get(patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patienten hittades inte' });
  }

  res.json(patient);
}

function getPatientJournal(req, res) {
  const patientId = parsePatientId(req.params.id);
  if (patientId === null) {
    return res.status(404).json({ error: 'Patienten hittades inte' });
  }

  const { role, userId, patientId: ownPatientId } = req.user;
  if (role === 'PATIENT') {
    if (patientId !== ownPatientId) {
      return res.status(403).json({ error: 'Åtkomst nekad' });
    }
  } else if (!STAFF_ROLES.includes(role)) {
    return res.status(403).json({ error: 'Åtkomst nekad' });
  }

  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patienten hittades inte' });
  }

  // PATIENT ser endast ALL för sin egen patient. Vårdpersonal ser STAFF och
  // ALL, samt PRIVATE om de själva är skaparen.
  const rows = role === 'PATIENT'
    ? db.prepare(`
        SELECT je.id, je.patient_id, je.author_id, u.name AS author_name,
               je.content, je.visibility, je.created_at
        FROM journal_entries je
        JOIN users u ON u.id = je.author_id
        WHERE je.patient_id = ? AND je.visibility = 'ALL'
        ORDER BY je.created_at
      `).all(patientId)
    : db.prepare(`
        SELECT je.id, je.patient_id, je.author_id, u.name AS author_name,
               je.content, je.visibility, je.created_at
        FROM journal_entries je
        JOIN users u ON u.id = je.author_id
        WHERE je.patient_id = ?
          AND (je.visibility IN ('STAFF', 'ALL') OR (je.visibility = 'PRIVATE' AND je.author_id = ?))
        ORDER BY je.created_at
      `).all(patientId, userId);

  res.json(rows.map(toJournalResponse));
}

function createJournalEntry(req, res) {
  const patientId = parsePatientId(req.params.id);
  if (patientId === null) {
    return res.status(404).json({ error: 'Patienten hittades inte' });
  }

  const { role, userId } = req.user;
  if (!STAFF_ROLES.includes(role)) {
    return res.status(403).json({ error: 'Åtkomst nekad' });
  }

  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patienten hittades inte' });
  }

  const { content, visibility } = req.body || {};
  if (typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'content krävs och får inte vara tomt' });
  }
  if (!VISIBILITY_VALUES.includes(visibility)) {
    return res.status(400).json({ error: 'visibility måste vara PRIVATE, STAFF eller ALL' });
  }

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO journal_entries (patient_id, author_id, content, visibility)
    VALUES (?, ?, ?, ?)
  `).run(patientId, userId, content, visibility);

  const row = db.prepare(`
    SELECT je.id, je.patient_id, je.author_id, u.name AS author_name,
           je.content, je.visibility, je.created_at
    FROM journal_entries je
    JOIN users u ON u.id = je.author_id
    WHERE je.id = ?
  `).get(lastInsertRowid);

  res.status(201).json(toJournalResponse(row));
}

module.exports = { listPatients, getPatient, getPatientJournal, createJournalEntry };
