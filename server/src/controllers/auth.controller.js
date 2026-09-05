const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const users = require('../data/users');

async function login(req, res) {
  const { username, password } = req.body || {};
  const user = typeof username === 'string'
    ? users.find((candidate) => candidate.username === username)
    : undefined;

  if (!user || typeof password !== 'string' || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Felaktiga inloggningsuppgifter' });
  }

  const identity = { userId: user.id, role: user.role };
  const publicUser = { id: user.id, name: user.name, role: user.role };
  if (user.role === 'PATIENT') {
    identity.patientId = user.patientId;
    publicUser.patientId = user.patientId;
  }

  const token = jwt.sign(identity, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, user: publicUser });
}

module.exports = { login };
