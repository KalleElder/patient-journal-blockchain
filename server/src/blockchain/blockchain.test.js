const test = require('node:test');
const assert = require('node:assert');

const Block = require('./Block');
const Blockchain = require('./Blockchain');
const { buildAuditData } = require('./auditLog');

// Fryst så att ett test inte kan påverka nästa genom att ändra i objektet.
const auditEvent = Object.freeze({
  userId: 1,
  patientId: 7,
  role: 'DOCTOR',
  action: 'READ_JOURNAL',
  timestamp: '2026-09-07T12:00:00.000Z',
});

// TEST 1
test('en ny blockkedja skapas med ett genesis block', () => {
  const blockchain = new Blockchain();

  assert.strictEqual(blockchain.chain.length, 1);
  assert.strictEqual(blockchain.chain[0].index, 0);
  assert.strictEqual(blockchain.chain[0].previousHash, '0');
  assert.match(blockchain.chain[0].hash, /^[0-9a-f]{64}$/);
});

test('genesis block blir identiskt på två noder', () => {
  assert.strictEqual(new Blockchain().chain[0].hash, new Blockchain().chain[0].hash);
});

// TEST 2
test('ett nytt block kan läggas till', () => {
  const blockchain = new Blockchain();
  const block = blockchain.addBlock(auditEvent);

  assert.strictEqual(blockchain.chain.length, 2);
  assert.strictEqual(block.index, 1);
  assert.deepStrictEqual(blockchain.getLatestBlock().data, auditEvent);
});

// TEST 3
test('nya block får previousHash från föregående block', () => {
  const blockchain = new Blockchain();
  const genesis = blockchain.chain[0];

  const first = blockchain.addBlock(auditEvent);
  const second = blockchain.addBlock({ ...auditEvent, action: 'CREATE_JOURNAL_ENTRY' });

  assert.strictEqual(first.previousHash, genesis.hash);
  assert.strictEqual(second.previousHash, first.hash);
});

// TEST 4
test('en korrekt kedja är giltig', () => {
  const blockchain = new Blockchain();
  blockchain.addBlock(auditEvent);
  blockchain.addBlock({ ...auditEvent, userId: 2, role: 'NURSE' });

  assert.strictEqual(blockchain.isChainValid(), true);
});

// TEST 5
test('ändrad data i ett gammalt block gör kedjan ogiltig', () => {
  const blockchain = new Blockchain();
  blockchain.addBlock(auditEvent);
  blockchain.addBlock({ ...auditEvent, userId: 2, role: 'NURSE' });

  // Någon försöker dölja att patient 7 lästes genom att peka om loggen.
  blockchain.chain[1].data.patientId = 8;

  assert.strictEqual(blockchain.isChainValid(), false);
});

test('ett block som räknas om men inte länkar rätt upptäcks ändå', () => {
  const blockchain = new Blockchain();
  blockchain.addBlock(auditEvent);
  blockchain.addBlock({ ...auditEvent, action: 'CREATE_JOURNAL_ENTRY' });

  // Här räknas hashen om, så blocket ser giltigt ut för sig självt.
  const tampered = blockchain.chain[1];
  tampered.data.patientId = 8;
  tampered.hash = tampered.calculateHash();

  assert.strictEqual(tampered.hasValidHash(), true);
  assert.strictEqual(blockchain.isChainValid(), false);
});

test('blocket påverkas inte av att anroparen ändrar sitt eget event-objekt', () => {
  const blockchain = new Blockchain();
  const event = { ...auditEvent };
  const block = blockchain.addBlock(event);

  event.patientId = 8;

  assert.strictEqual(block.data.patientId, 7);
  assert.strictEqual(blockchain.isChainValid(), true);
});

test('ett utbytt genesis block upptäcks', () => {
  const blockchain = new Blockchain();
  blockchain.chain[0] = new Block({
    index: 0,
    timestamp: '2020-01-01T00:00:00.000Z',
    data: { action: 'GENESIS' },
    previousHash: '0',
  });

  assert.strictEqual(blockchain.isChainValid(), false);
});

// TEST 6
test('audit-data kan lagras utan journaltext', () => {
  const blockchain = new Blockchain();
  const block = blockchain.addBlock(buildAuditData(auditEvent));

  assert.deepStrictEqual(Object.keys(block.data).sort(), [
    'action', 'patientId', 'role', 'timestamp', 'userId',
  ]);
  assert.strictEqual(blockchain.isChainValid(), true);
});

test('journaltext avvisas och kan inte hamna i kedjan', () => {
  assert.throws(
    () => buildAuditData({ ...auditEvent, content: 'Patienten har diabetes' }),
    /content/,
  );
});

test('audit-data med saknade fält avvisas', () => {
  assert.throws(() => buildAuditData({ userId: 1, role: 'DOCTOR' }), /saknar fält/);
});

test('audit-data med okänd roll avvisas', () => {
  assert.throws(() => buildAuditData({ ...auditEvent, role: 'ADMIN' }), /Okänd roll/);
});

test('samma innehåll ger samma hash oavsett nyckelordning', () => {
  const first = new Block({
    index: 1,
    timestamp: auditEvent.timestamp,
    data: { userId: 1, patientId: 7 },
    previousHash: 'abc',
  });
  const second = new Block({
    index: 1,
    timestamp: auditEvent.timestamp,
    data: { patientId: 7, userId: 1 },
    previousHash: 'abc',
  });

  assert.strictEqual(first.hash, second.hash);
});
