const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

async function login(req, res) {
  const { username, password } = req.body || {};
  const user = typeof username === 'string'
    ? db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    : undefined;

  if (!user || typeof password !== 'string' || !await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: 'Felaktiga inloggningsuppgifter' });
  }

  const identity = { userId: user.id, role: user.role };
  const publicUser = { id: user.id, name: user.name, role: user.role };
  if (user.role === 'PATIENT') {
    identity.patientId = user.patient_id;
    publicUser.patientId = user.patient_id;
  }

  const token = jwt.sign(identity, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, user: publicUser });
}

module.exports = { login };
