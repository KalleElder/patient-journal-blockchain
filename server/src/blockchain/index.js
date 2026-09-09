const Block = require('./Block');
const Blockchain = require('./Blockchain');
const { buildAuditData, ALLOWED_FIELDS, KNOWN_ROLES } = require('./auditLog');

// Nodens kedja. Den ligger i minnet så länge servern kör och är ännu inte
// inkopplad i någon route. Backendens auditLogger ska kunna anropa
// createAuditLog() utan att känna till hur block eller hashning fungerar.
const auditChain = new Blockchain();

// P2P-lagret registrerar sig här för att få veta när noden själv har skapat
// ett audit-block, så att det kan skickas vidare till de andra noderna.
// Blockchain-modulen slipper därmed veta att det finns ett nätverk, och
// backendens auditLogger anropar fortfarande bara createAuditLog().
let nyttBlockLyssnare = null;

function setNewBlockListener(lyssnare) {
  nyttBlockLyssnare = lyssnare;
}

function createAuditLog(event) {
  const block = auditChain.addBlock(buildAuditData(event));

  if (nyttBlockLyssnare) {
    nyttBlockLyssnare(block);
  }

  return block;
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
  setNewBlockListener,
  ALLOWED_FIELDS,
  KNOWN_ROLES,
};
