const express = require('express');
const { login } = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();
router.post('/login', login);
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
