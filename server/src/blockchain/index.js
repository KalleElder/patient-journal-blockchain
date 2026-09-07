const Block = require('./Block');
const Blockchain = require('./Blockchain');
const { buildAuditData, ALLOWED_FIELDS, KNOWN_ROLES } = require('./auditLog');

// Nodens kedja. Den ligger i minnet så länge servern kör och är ännu inte
// inkopplad i någon route. Backendens auditLogger ska kunna anropa
// createAuditLog() utan att känna till hur block eller hashning fungerar.
const auditChain = new Blockchain();

function createAuditLog(event) {
  return auditChain.addBlock(buildAuditData(event));
}

function getAuditChain() {
  return auditChain;
}

module.exports = {
  Block,
  Blockchain,
  buildAuditData,
  createAuditLog,
  getAuditChain,
  ALLOWED_FIELDS,
  KNOWN_ROLES,
};
