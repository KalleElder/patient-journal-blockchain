const path = require('node:path');
const http = require('node:http');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET måste anges i projektets .env eller miljön.');
  process.exit(1);
}

const app = require('./app');
const { getAuditChain, setNewBlockListener } = require('./blockchain');
const { createP2PNode } = require('./p2p/p2pServer');
const registerDevAuditRoutes = require('./p2p/devAuditRoutes');

const port = process.env.PORT || 3001;

// PEER_URL kan innehålla flera adresser separerade med komma. Är den tom
// startar noden ensam, precis som tidigare.
const peerUrls = (process.env.PEER_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

// Socket.io behöver en HTTP-server att ligga på, så app.listen() räcker inte.
const server = http.createServer(app);

const p2p = createP2PNode({
  httpServer: server,
  blockchain: getAuditChain(),
  name: port,
  peerUrls,
});

// Skapar den här noden ett audit-block ska grannarna få veta det direkt.
setNewBlockListener((block) => p2p.broadcastBlock(block));

registerDevAuditRoutes(app, port);

server.listen(port, () => {
  console.log(`[NODE ${port}] Server started`);
});
