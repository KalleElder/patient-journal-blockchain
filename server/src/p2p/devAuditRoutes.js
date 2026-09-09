const { createAuditLog, getAuditChain } = require('../blockchain');

// Tillfälligt utvecklingsverktyg. Backendens auditLogger finns inte än, och
// utan något sätt att skapa ett audit-block i en körande server går det inte
// att visa broadcast mellan två terminaler.
//
// Rutterna är avstängda som standard och kräver P2P_DEV_ROUTES=true. De ska
// tas bort så snart auditLogger finns, eftersom de skriver till kedjan utan
// inloggning.
function registerDevAuditRoutes(app, name) {
  if (process.env.P2P_DEV_ROUTES !== 'true') {
    return false;
  }

  app.post('/api/dev/audit', (req, res) => {
    try {
      const block = createAuditLog(req.body || {});
      res.status(201).json({ index: block.index, hash: block.hash });
    } catch (error) {
      // buildAuditData kastar på fält som inte hör hemma i ett audit-block.
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/dev/chain', (req, res) => {
    const blockchain = getAuditChain();

    res.json({
      length: blockchain.chain.length,
      valid: blockchain.isChainValid(),
      latestHash: blockchain.getLatestBlock().hash,
      chain: blockchain.chain,
    });
  });

  console.log(`[NODE ${name}] Dev-rutter aktiva: POST /api/dev/audit, GET /api/dev/chain`);
  return true;
}

module.exports = registerDevAuditRoutes;
