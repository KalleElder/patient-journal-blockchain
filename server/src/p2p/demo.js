// Demonstration av P2P-synkroniseringen. Startar två noder i samma process,
// kopplar ihop dem och visar både när en kedja accepteras och när den nekas.
//
// Körs med `node src/p2p/demo.js` från server/.
//
// Vill man i stället se två riktiga servrar, se avsnittet om två terminaler i
// server/src/p2p/README.md.
const http = require('node:http');
const { io: connectToPeer } = require('socket.io-client');

const Blockchain = require('../blockchain/Blockchain');
const { createP2PNode, EVENTS } = require('./p2pServer');

const PORT_1 = 3001;
const PORT_2 = 3002;

const auditEvent = {
  userId: 1,
  patientId: 7,
  role: 'DOCTOR',
  action: 'READ_JOURNAL',
  timestamp: '2026-09-07T12:00:00.000Z',
};

const paus = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

function rubrik(text) {
  console.log(`\n${'='.repeat(64)}\n${text}\n${'='.repeat(64)}`);
}

async function startaNod(port, peerUrls) {
  const blockchain = new Blockchain();
  const httpServer = http.createServer();
  const node = createP2PNode({
    httpServer, blockchain, name: port, peerUrls,
  });

  await new Promise((resolve) => { httpServer.listen(port, resolve); });
  console.log(`[NODE ${port}] Server started`);

  return { port, node, blockchain };
}

function status(nod) {
  console.log(
    `[NODE ${nod.port}] ${nod.blockchain.chain.length} block, `
    + `giltig: ${nod.blockchain.isChainValid()}, `
    + `sista hash: ${nod.blockchain.getLatestBlock().hash.slice(0, 12)}...`,
  );
}

async function main() {
  rubrik('1. Node 3001 startar ensam och loggar två åtkomster');

  const node1 = await startaNod(PORT_1, []);
  node1.blockchain.addBlock({ ...auditEvent, action: 'READ_JOURNAL' });
  node1.blockchain.addBlock({ ...auditEvent, userId: 2, action: 'CREATE_JOURNAL_ENTRY' });
  status(node1);

  rubrik('2. Node 3002 startar, ansluter till 3001 och hämtar kedjan');

  const node2 = await startaNod(PORT_2, [`http://localhost:${PORT_1}`]);
  await paus(600);
  status(node2);

  rubrik('3. Node 3001 skapar ett nytt audit-block och skickar ut det');

  const nyttBlock = node1.blockchain.addBlock({ ...auditEvent, userId: 3, action: 'READ_JOURNAL' });
  node1.node.broadcastBlock(nyttBlock);
  await paus(600);
  status(node1);
  status(node2);

  rubrik('4. En nod skickar en längre men manipulerad kedja till 3002');

  const angripare = new Blockchain();
  for (let i = 0; i < 5; i += 1) {
    angripare.addBlock({ ...auditEvent, userId: i + 1 });
  }

  const manipulerad = JSON.parse(JSON.stringify(angripare.chain));
  manipulerad[2].data.userId = 99;

  const klient = connectToPeer(`http://localhost:${PORT_2}`, { transports: ['websocket'] });
  await new Promise((resolve) => { klient.on('connect', resolve); });
  klient.emit(EVENTS.CHAIN, manipulerad);
  await paus(600);
  status(node2);

  rubrik('5. Samma nod försöker skicka in journaltext i en korrekt hashad kedja');

  const medJournaltext = new Blockchain();
  for (let i = 0; i < 4; i += 1) {
    medJournaltext.addBlock({ ...auditEvent, userId: i + 1 });
  }
  medJournaltext.addBlock({ patientId: 7, content: 'Patienten har diabetes typ 2' });

  console.log(`Kedjan hashar korrekt: ${medJournaltext.isChainValid()}`);
  klient.emit(EVENTS.CHAIN, JSON.parse(JSON.stringify(medJournaltext.chain)));
  await paus(600);
  status(node2);

  rubrik('6. En kortare kedja skickas till 3002');

  const kort = new Blockchain();
  kort.addBlock(auditEvent);
  klient.emit(EVENTS.CHAIN, JSON.parse(JSON.stringify(kort.chain)));
  await paus(600);
  status(node2);

  rubrik('Resultat');

  const sammaKedja = node1.blockchain.getLatestBlock().hash
    === node2.blockchain.getLatestBlock().hash;

  console.log(`Noderna har samma kedja: ${sammaKedja}`);
  console.log(`Båda kedjorna är giltiga: ${node1.blockchain.isChainValid() && node2.blockchain.isChainValid()}`);
  console.log(`Ingen journaltext i kedjan: ${!JSON.stringify(node2.blockchain.chain).includes('diabetes')}`);

  klient.disconnect();
  await node1.node.close();
  await node2.node.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
