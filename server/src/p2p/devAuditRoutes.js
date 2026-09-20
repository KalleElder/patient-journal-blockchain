const { getAuditChain } = require('../blockchain');

// Tillfällig read-only-route för utveckling och demonstration av P2P-synk.
// Den kan endast läsa blockchainen och kan inte skapa audit-block.
//
// Routen är avstängd som standard och kräver P2P_DEV_ROUTES=true.
function registerDevAuditRoutes(app, name) {
  if (process.env.P2P_DEV_ROUTES !== 'true') {
    return false;
  }

  app.get('/api/dev/chain', (req, res) => {
    const blockchain = getAuditChain();

    res.json({
      length: blockchain.chain.length,
      valid: blockchain.isChainValid(),
      latestHash: blockchain.getLatestBlock().hash,
      chain: blockchain.chain,
    });
  });

  console.log(`[NODE ${name}] Dev-route aktiv: GET /api/dev/chain`);
  return true;
}

module.exports = registerDevAuditRoutes;
