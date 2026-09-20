const { createAuditLog } = require('../blockchain');

/**
 * Skapar ett audit-event för åtkomst till patientjournalen.
 *
 * Endast metadata skickas vidare till blockchain.
 * Medicinsk journaltext får aldrig skickas hit.
 */
function logAuditEvent({
  userId,
  patientId,
  role,
  action,
  timestamp = new Date().toISOString(),
}) {
  return createAuditLog({
    userId,
    patientId,
    role,
    action,
    timestamp,
  });
}

module.exports = {
  logAuditEvent,
};
