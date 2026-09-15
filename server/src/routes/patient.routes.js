const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const {
  listPatients,
  getPatient,
  getPatientJournal,
  createJournalEntry,
} = require('../controllers/patient.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', listPatients);
router.get('/:id', getPatient);
router.get('/:id/journal', getPatientJournal);
router.post('/:id/journal', createJournalEntry);

module.exports = router;
