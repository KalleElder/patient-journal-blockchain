const test = require('node:test');
const assert = require('node:assert');

const Block = require('./Block');
const Blockchain = require('./Blockchain');

const auditEvent = Object.freeze({
  userId: 1,
  patientId: 7,
  role: 'DOCTOR',
  action: 'READ_JOURNAL',
  timestamp: '2026-09-07T12:00:00.000Z',
});

// Skickar en kedja genom JSON precis som Socket.io gör. Efter det är blocken
// vanliga objekt utan metoder, vilket är det som gör deserialiseringen viktig.
function överNätet(chain) {
  return JSON.parse(JSON.stringify(chain));
}

function kedjaMed(antalBlock) {
  const blockchain = new Blockchain();

  for (let i = 0; i < antalBlock; i += 1) {
    blockchain.addBlock({ ...auditEvent, userId: i + 1 });
  }

  return blockchain;
}

test('en längre giltig kedja accepteras', () => {
  const node1 = kedjaMed(2);
  const node2 = new Blockchain();

  assert.strictEqual(node2.replaceChain(node1.chain), true);
  assert.strictEqual(node2.chain.length, 3);
  assert.strictEqual(node2.getLatestBlock().hash, node1.getLatestBlock().hash);
});

test('en kortare kedja nekas och den lokala kedjan behålls', () => {
  const node1 = kedjaMed(1);
  const node2 = kedjaMed(3);
  const eget = node2.getLatestBlock().hash;

  assert.strictEqual(node2.replaceChain(node1.chain), false);
  assert.strictEqual(node2.chain.length, 4);
  assert.strictEqual(node2.getLatestBlock().hash, eget);
});

// Lika lång kedja räknas som en fork. Tills vi bygger fork-hantering vinner
// alltid den lokala kedjan, annars skulle noderna kunna skriva över varandra
// fram och tillbaka i all oändlighet.
test('en lika lång kedja nekas', () => {
  const node1 = kedjaMed(2);
  const node2 = kedjaMed(2);
  const eget = node2.getLatestBlock().hash;

  assert.strictEqual(node2.replaceChain(node1.chain), false);
  assert.strictEqual(node2.getLatestBlock().hash, eget);
});

test('en tom kedja nekas', () => {
  const node2 = new Blockchain();

  assert.strictEqual(node2.replaceChain([]), false);
  assert.strictEqual(node2.chain.length, 1);
});

test('skräpdata i stället för en kedja nekas i stället för att krascha', () => {
  const node2 = kedjaMed(1);

  for (const skräp of [null, undefined, 'kedja', 42, {}, [null], ['block'], [{ index: 0 }]]) {
    assert.strictEqual(node2.replaceChain(skräp), false);
  }

  assert.strictEqual(node2.chain.length, 2);
});

// Ett block vars data är djupt kapslad tar structuredClone och hashningen
// genom hela anropsstacken. Utan skydd kraschar noden i stället för att neka
// kedjan, vilket räcker för att slå ut en nod utifrån.
test('ett block med djupt kapslad data nekas i stället för att krascha noden', () => {
  let djup = {};
  let nivå = djup;
  for (let i = 0; i < 5000; i += 1) {
    nivå.n = {};
    nivå = nivå.n;
  }
  djup = { userId: djup };

  const node2 = kedjaMed(1);
  const kedja = [
    {
      index: 0,
      timestamp: '2026-09-01T00:00:00.000Z',
      data: djup,
      previousHash: '0',
      hash: 'a'.repeat(64),
    },
    {
      index: 1, timestamp: '2026-09-07T12:00:00.000Z', data: auditEvent, previousHash: 'a'.repeat(64), hash: 'b'.repeat(64),
    },
    {
      index: 2, timestamp: '2026-09-07T12:00:00.000Z', data: auditEvent, previousHash: 'b'.repeat(64), hash: 'c'.repeat(64),
    },
  ];

  assert.strictEqual(node2.replaceChain(kedja), false);
  assert.strictEqual(node2.chain.length, 2);
});

// Data ska vara några fält med primitiva värden, inget annat.
test('block med data som inte är ett platt objekt nekas', () => {
  const bas = {
    index: 1, timestamp: '2026-09-07T12:00:00.000Z', previousHash: 'a'.repeat(64), hash: 'b'.repeat(64),
  };

  for (const data of [null, 'text', 42, [], [1, 2], { userId: {} }, { userId: [1] }]) {
    assert.strictEqual(Block.fromJSON({ ...bas, data }), null);
  }

  assert.ok(Block.fromJSON({ ...bas, data: auditEvent }) instanceof Block);
});

// Den vanligaste manipulationen: någon ändrar innehållet i ett block men låter
// den gamla hashen ligga kvar.
test('en längre kedja med ändrad data nekas', () => {
  const node1 = kedjaMed(3);
  const node2 = new Blockchain();

  const skickad = överNätet(node1.chain);
  skickad[2].data.userId = 99;

  assert.strictEqual(node2.replaceChain(skickad), false);
  assert.strictEqual(node2.chain.length, 1);
});

// Den smartare varianten: angriparen räknar om hashen för sitt ändrade block.
// Då stämmer blockets egen hash, men nästa block pekar fortfarande på den
// gamla hashen och länken brister.
test('en längre kedja med ändrad data och omräknad hash nekas', () => {
  const node1 = kedjaMed(3);
  const node2 = new Blockchain();

  const skickad = överNätet(node1.chain);
  skickad[2].data.userId = 99;
  skickad[2].hash = Block.fromJSON(skickad[2]).calculateHash();

  assert.strictEqual(node2.replaceChain(skickad), false);
  assert.strictEqual(node2.chain.length, 1);
});

test('en längre kedja med manipulerat genesis block nekas', () => {
  const node1 = kedjaMed(3);
  const node2 = new Blockchain();

  const skickad = överNätet(node1.chain);
  skickad[0].data.action = 'FEJKAD_GENESIS';

  assert.strictEqual(node2.replaceChain(skickad), false);
});

// Två noder som inte utgår från samma genesis hör inte ihop och ska aldrig
// kunna skriva över varandras kedjor.
test('en kedja med ett helt annat genesis block nekas', () => {
  const node2 = new Blockchain();

  const främmande = new Block({
    index: 0,
    timestamp: '2020-01-01T00:00:00.000Z',
    data: { action: 'ANNAT_NÄTVERK' },
    previousHash: '0',
  });

  const kedja = [främmande];
  for (let i = 1; i <= 3; i += 1) {
    kedja.push(new Block({
      index: i,
      timestamp: '2026-09-07T12:00:00.000Z',
      data: auditEvent,
      previousHash: kedja[i - 1].hash,
    }));
  }

  assert.strictEqual(node2.replaceChain(överNätet(kedja)), false);
});

test('båda noderna utgår från samma genesis block', () => {
  const node1 = new Blockchain();
  const node2 = new Blockchain();

  assert.strictEqual(node1.chain[0].hash, node2.chain[0].hash);

  node1.addBlock(auditEvent);
  node2.replaceChain(node1.chain);

  assert.strictEqual(node2.chain[0].hash, node1.chain[0].hash);
});

// Det här är fällan Kalle varnade för. En kedja som kommit via JSON innehåller
// vanliga objekt, och då finns varken hasValidHash() eller calculateHash().
test('block som kommit via JSON blir riktiga Block-objekt igen', () => {
  const node1 = kedjaMed(2);
  const skickad = överNätet(node1.chain);

  assert.strictEqual(typeof skickad[1].hasValidHash, 'undefined');

  const node2 = new Blockchain();
  assert.strictEqual(node2.replaceChain(skickad), true);

  for (const block of node2.chain) {
    assert.ok(block instanceof Block);
    assert.strictEqual(block.hasValidHash(), true);
  }
});

test('en nod kan bygga vidare på en kedja den tagit emot över nätet', () => {
  const node1 = kedjaMed(2);
  const node2 = new Blockchain();

  node2.replaceChain(överNätet(node1.chain));
  node2.addBlock({ ...auditEvent, action: 'CREATE_JOURNAL_ENTRY' });

  assert.strictEqual(node2.chain.length, 4);
  assert.strictEqual(node2.isChainValid(), true);
});

// Block.fromJSON får aldrig räkna om hashen. Gör den det så skulle varje
// manipulerat block bli giltigt i samma stund som det togs emot.
test('fromJSON behåller den medskickade hashen i stället för att räkna om den', () => {
  const block = new Block({
    index: 1,
    timestamp: '2026-09-07T12:00:00.000Z',
    data: auditEvent,
    previousHash: 'abc',
  });

  const manipulerat = { ...block, data: { ...auditEvent, userId: 99 } };
  const återskapat = Block.fromJSON(manipulerat);

  assert.strictEqual(återskapat.hash, block.hash);
  assert.strictEqual(återskapat.hasValidHash(), false);
});

test('ett nytt block från en annan nod läggs till om det passar sist i kedjan', () => {
  const node1 = kedjaMed(1);
  const node2 = new Blockchain();
  node2.replaceChain(node1.chain);

  const nytt = node1.addBlock({ ...auditEvent, action: 'CREATE_JOURNAL_ENTRY' });

  assert.strictEqual(node2.addReceivedBlock(överNätet([nytt])[0]), true);
  assert.strictEqual(node2.chain.length, 3);
  assert.strictEqual(node2.isChainValid(), true);
});

// Ligger noderna för långt isär passar inte blocket ovanpå, och då ska
// mottagaren hämta hela kedjan i stället för att gissa.
test('ett nytt block som inte passar sist i kedjan nekas', () => {
  const node1 = kedjaMed(3);
  const node2 = new Blockchain();

  const nytt = node1.addBlock(auditEvent);

  assert.strictEqual(node2.addReceivedBlock(överNätet([nytt])[0]), false);
  assert.strictEqual(node2.chain.length, 1);
});

test('ett manipulerat enskilt block nekas', () => {
  const node1 = kedjaMed(1);
  const node2 = new Blockchain();
  node2.replaceChain(node1.chain);

  const nytt = överNätet([node1.addBlock(auditEvent)])[0];
  nytt.data.userId = 99;

  assert.strictEqual(node2.addReceivedBlock(nytt), false);
  assert.strictEqual(node2.chain.length, 2);
});
