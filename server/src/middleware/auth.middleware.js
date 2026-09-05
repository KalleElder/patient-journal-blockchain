const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const match = /^Bearer ([^\s]+)$/i.exec(req.get('Authorization') || '');
  if (!match) {
    return res.status(401).json({ error: 'Ogiltig eller saknad token' });
  }

  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET);
    req.user = { userId: payload.userId, role: payload.role };
    if (payload.role === 'PATIENT' && payload.patientId != null) {
      req.user.patientId = payload.patientId;
    }
  } catch {
    return res.status(401).json({ error: 'Ogiltig eller saknad token' });
  }
  next();
}

module.exports = authenticate;
