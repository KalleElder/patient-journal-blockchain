const express = require('express');
const authRoutes = require('./routes/auth.routes');

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'patient-journal-backend' });
});
app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Ogiltig JSON' });
  }
  res.status(500).json({ error: 'Internt serverfel' });
});

module.exports = app;
