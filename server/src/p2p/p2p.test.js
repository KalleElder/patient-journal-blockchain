const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { io: connectToPeer } = require('socket.io-client');

const Block = require('../blockchain/Block');
const Blockchain = require('../blockchain/Blockchain');
const { createP2PNode, EVENTS } = require('./p2pServer');

const auditEvent = Object.freeze({
  userId: 1,
  patientId: 7,
  role: 'DOCTOR',
  action: 'READ_JOURNAL',
  timestamp: '2026-09-07T12:00:00.000Z',
});

const url = (port) => `http://localhost:${port}`;

// Städningen registreras med t.after() i stället för i slutet av varje test.
// Failar en assertion hoppas resten av testet över, och utan t.after() skulle
// sockets ligga kvar öppna och hela testkörningen hänga sig i stället för att
// rapportera felet.
async function startaNod(t, { peerUrls = [], antalBlock = 0, loggar } = {}) {
  const blockchain = new Blockchain();

  for (let i = 0; i < antalBlock; i += 1) {
    blockchain.addBlock({ ...auditEvent, userId: i + 1 });
  }

  // Port 0 betyder att operativsystemet väljer en ledig port. Med fasta
  // portnummer failar testerna så fort porten råkar vara upptagen, till
  // exempel av en nod från en avbruten körning som aldrig hann städas undan.
  const httpServer = http.createServer();
  await new Promise((resolve) => { httpServer.listen(0, resolve); });
  const port = httpServer.address().port;

  const node = createP2PNode({
    httpServer,
    blockchain,
    name: port,
    peerUrls,
    log: loggar ? (rad) => loggar.push(rad) : () => {},
  });

  t.after(() => node.close());

  return { port, node, blockchain };
}

// En rå klient som kan skicka precis vad som helst till en nod, för att testa
// hur noden beter sig mot en granne som inte följer reglerna.
function anslutSomKlient(t, port) {
  const socket = connectToPeer(url(port), { transports: ['websocket'] });
  t.after(() => socket.disconnect());

  return new Promise((resolve) => { socket.on('connect', () => resolve(socket)); });
}

// Synk sker över riktiga sockets, så testerna får vänta in resultatet i
// stället för att anta att det redan hunnit hända.
async function väntaTills(villkor, beskrivning, timeoutMs = 5000) {
  const slutar = Date.now() + timeoutMs;

  while (Date.now() < slutar) {
    if (villkor()) {
      return;
    }

    await new Promise((resolve) => { setTimeout(resolve, 20); });
  }

  throw new Error(`Tidsgränsen gick ut innan: ${beskrivning}`);
}

// Används när ingenting ska hända. Då finns inget att vänta in, så vi får ge
// noden en stund och sedan kontrollera att kedjan står kvar orörd.
const paus = (ms = 300) => new Promise((resolve) => { setTimeout(resolve, ms); });

test('en nod som ansluter hämtar grannens kedja', async (t) => {
  const node1 = await startaNod(t, { antalBlock: 2 });
  const node2 = await startaNod(t, { peerUrls: [url(node1.port)] });

  await väntaTills(() => node2.blockchain.chain.length === 3, 'node2 har hämtat kedjan');

  assert.strictEqual(node2.blockchain.getLatestBlock().hash, node1.blockchain.getLatestBlock().hash);
  assert.strictEqual(node2.blockchain.isChainValid(), true);
});

test('båda noderna använder samma genesis block', async (t) => {
  const node1 = await startaNod(t, { antalBlock: 1 });
  const node2 = await startaNod(t, { peerUrls: [url(node1.port)] });

  await väntaTills(() => node2.blockchain.chain.length === 2, 'node2 har synkat');

  assert.strictEqual(node2.blockchain.chain[0].hash, node1.blockchain.chain[0].hash);
});

// Noden som ligger efter ska komma ikapp och den som ligger före ska behålla
// sin kedja. Det spelar ingen roll vem som anslöt till vem.
test('en kortare kedja skriver inte över en längre', async (t) => {
  const node1 = await startaNod(t, { antalBlock: 1 });
  const node2 = await startaNod(t, { peerUrls: [url(node1.port)], antalBlock: 3 });

  await väntaTills(() => node1.blockchain.chain.length === 4, 'node1 har kommit ikapp');

  assert.strictEqual(node2.blockchain.chain.length, 4);
  assert.strictEqual(node1.blockchain.getLatestBlock().hash, node2.blockchain.getLatestBlock().hash);
});

test('en manipulerad kedja nekas över nätet', async (t) => {
  const node1 = await startaNod(t, { antalBlock: 1 });
  const eget = node1.blockchain.getLatestBlock().hash;

  const angripare = new Blockchain();
  for (let i = 0; i < 4; i += 1) {
    angripare.addBlock({ ...auditEvent, userId: i + 1 });
  }

  const skickad = JSON.parse(JSON.stringify(angripare.chain));
  skickad[2].data.userId = 99;

  const klient = await anslutSomKlient(t, node1.port);
  klient.emit(EVENTS.CHAIN, skickad);

  // Kedjan är längre än nodens egen, så hade valideringen saknats skulle den
  // ha slunkit igenom.
  await paus();

  assert.strictEqual(node1.blockchain.chain.length, 2);
  assert.strictEqual(node1.blockchain.getLatestBlock().hash, eget);
});

// Kedjan kan hasha helt korrekt och ändå innehålla sådant som aldrig får
// lagras. Att blocken hänger ihop bevisar bara att ingen ändrat i dem efteråt.
test('en kedja med journaltext nekas även om hasharna stämmer', async (t) => {
  const node1 = await startaNod(t, { antalBlock: 1 });

  const angripare = new Blockchain();
  angripare.addBlock(auditEvent);
  angripare.addBlock({ patientId: 7, content: 'Patienten har diabetes typ 2' });
  angripare.addBlock(auditEvent);

  assert.strictEqual(angripare.isChainValid(), true);
  assert.ok(angripare.chain.length > node1.blockchain.chain.length);

  const klient = await anslutSomKlient(t, node1.port);
  klient.emit(EVENTS.CHAIN, JSON.parse(JSON.stringify(angripare.chain)));

  await paus();

  assert.strictEqual(node1.blockchain.chain.length, 2);
  assert.strictEqual(JSON.stringify(node1.blockchain.chain).includes('diabetes'), false);
});

// En granne ska inte kunna slå ut noden med en enda illa menad payload.
// Djupt kapslad data i genesis kraschade tidigare hela processen, eftersom
// genesis hoppas över i innehållskontrollen och deserialiseringen kastade.
test('en kedja med djupt kapslad data tar inte ner noden', async (t) => {
  const node1 = await startaNod(t, { antalBlock: 1 });
  const eget = node1.blockchain.getLatestBlock().hash;

  // 2000 nivåer går att skicka över Socket.io, men är mer än structuredClone
  // klarar. Utan skyddet hade den här kedjan alltså tagit ner noden.
  let djup = {};
  let nivå = djup;
  for (let i = 0; i < 2000; i += 1) {
    nivå.n = {};
    nivå = nivå.n;
  }
  djup = { userId: djup };

  const klient = await anslutSomKlient(t, node1.port);
  klient.emit(EVENTS.CHAIN, [
    {
      index: 0, timestamp: '2026-09-01T00:00:00.000Z', data: djup, previousHash: '0', hash: 'a'.repeat(64),
    },
    {
      index: 1, timestamp: '2026-09-07T12:00:00.000Z', data: auditEvent, previousHash: 'a'.repeat(64), hash: 'b'.repeat(64),
    },
    {
      index: 2, timestamp: '2026-09-07T12:00:00.000Z', data: auditEvent, previousHash: 'b'.repeat(64), hash: 'c'.repeat(64),
    },
  ]);

  await paus();

  // Noden lever och har kvar sin egen kedja.
  assert.strictEqual(node1.blockchain.chain.length, 2);
  assert.strictEqual(node1.blockchain.getLatestBlock().hash, eget);

  // Och den svarar fortfarande på nätet.
  const svar = new Promise((resolve) => { klient.once(EVENTS.CHAIN, resolve); });
  klient.emit(EVENTS.REQUEST_CHAIN);
  assert.strictEqual((await svar).length, 2);
});

test('en tom kedja över nätet ändrar ingenting', async (t) => {
  const node1 = await startaNod(t, { antalBlock: 2 });

  const klient = await anslutSomKlient(t, node1.port);
  klient.emit(EVENTS.CHAIN, []);

  await paus();

  assert.strictEqual(node1.blockchain.chain.length, 3);
  assert.strictEqual(node1.blockchain.isChainValid(), true);
});

test('ett nytt audit-block synkas till den andra noden', async (t) => {
  const node1 = await startaNod(t);
  const node2 = await startaNod(t, { peerUrls: [url(node1.port)] });

  await väntaTills(() => node2.blockchain.chain.length === 1, 'noderna är anslutna');

  const block = node1.blockchain.addBlock(auditEvent);
  node1.node.broadcastBlock(block);

  await väntaTills(() => node2.blockchain.chain.length === 2, 'node2 har fått blocket');

  assert.strictEqual(node2.blockchain.getLatestBlock().hash, block.hash);
  assert.strictEqual(node2.blockchain.isChainValid(), true);
});

// Om en nod har missat några block passar inte nästa block ovanpå dess kedja.
// Då ska den be om hela kedjan i stället för att lägga blocket på fel plats.
test('en nod som ligger efter hämtar hela kedjan när ett block inte passar', async (t) => {
  const node1 = await startaNod(t);
  const node2 = await startaNod(t, { peerUrls: [url(node1.port)] });

  await väntaTills(() => node2.blockchain.chain.length === 1, 'noderna är anslutna');

  // Skapas utan broadcast, så node2 missar dem och hamnar efter.
  node1.blockchain.addBlock(auditEvent);
  node1.blockchain.addBlock({ ...auditEvent, action: 'CREATE_JOURNAL_ENTRY' });

  const block = node1.blockchain.addBlock({ ...auditEvent, action: 'DELETE_JOURNAL_ENTRY' });
  node1.node.broadcastBlock(block);

  await väntaTills(() => node2.blockchain.chain.length === 4, 'node2 har hämtat hela kedjan');

  assert.strictEqual(node2.blockchain.getLatestBlock().hash, node1.blockchain.getLatestBlock().hash);
  assert.strictEqual(node2.blockchain.isChainValid(), true);
});

test('ett manipulerat enskilt block nekas över nätet', async (t) => {
  const node1 = await startaNod(t, { antalBlock: 1 });
  const eget = node1.blockchain.getLatestBlock().hash;

  const kopia = new Blockchain();
  kopia.replaceChain(node1.blockchain.chain);
  const block = JSON.parse(JSON.stringify(kopia.addBlock(auditEvent)));
  block.data.userId = 99;

  const klient = await anslutSomKlient(t, node1.port);
  klient.emit(EVENTS.NEW_BLOCK, block);

  await paus();

  assert.strictEqual(node1.blockchain.chain.length, 2);
  assert.strictEqual(node1.blockchain.getLatestBlock().hash, eget);
});

test('block som kommit över nätet är riktiga Block-objekt', async (t) => {
  const node1 = await startaNod(t, { antalBlock: 2 });
  const node2 = await startaNod(t, { peerUrls: [url(node1.port)] });

  await väntaTills(() => node2.blockchain.chain.length === 3, 'node2 har synkat');

  for (const block of node2.blockchain.chain) {
    assert.ok(block instanceof Block);
    assert.strictEqual(block.hasValidHash(), true);
  }

  // Noden ska kunna bygga vidare på det den tagit emot.
  node2.blockchain.addBlock(auditEvent);
  assert.strictEqual(node2.blockchain.isChainValid(), true);
});

// Loggarna används både vid felsökning och i redovisningen, så det är värt att
// veta att de faktiskt kommer och ser ut som de ska.
test('synken loggar vad som händer', async (t) => {
  const loggar = [];
  const node1 = await startaNod(t, { antalBlock: 2 });
  const node2 = await startaNod(t, { peerUrls: [url(node1.port)], loggar });

  await väntaTills(() => node2.blockchain.chain.length === 3, 'node2 har synkat');

  const allt = loggar.join('\n');

  assert.match(allt, new RegExp(`^\\[NODE ${node2.port}\\] `, 'm'));
  assert.match(allt, /Connected to http:\/\/localhost:\d+/);
  assert.match(allt, /Received chain \(3 block\)/);
  assert.match(allt, /Chain valid/);
  assert.match(allt, /Chain replaced \(3 block\)/);
});
