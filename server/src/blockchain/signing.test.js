const test = require('node:test');
const assert = require('node:assert');
const { sign, createPrivateKey } = require('node:crypto');

const Block = require('./Block');
const Blockchain = require('./Blockchain');
const {
  generateKeyPair, publicKeyFromPrivate, signHash, verifyHash,
} = require('./signing');
const { configure, getSigningKey, isTrusted } = require('./keyring');

const auditEvent = Object.freeze({
  userId: 1,
  patientId: 7,
  role: 'DOCTOR',
  action: 'READ_JOURNAL',
  timestamp: '2026-09-27T12:00:00.000Z',
});

// Noden i testerna har en känd nyckel. Angriparen har en annan, som noden
// aldrig är konfigurerad att lita på. Det är skillnaden mellan de två som
// avgör om signeringen skyddar något: utan betrodda nycklar kan vem som helst
// signera om ett manipulerat block med sin egen nyckel.
const nod = generateKeyPair();
const angripare = generateKeyPair();

function grundkonfiguration() {
  configure({ privateKey: nod.privateKey });
}

grundkonfiguration();

// Skickar en kedja genom JSON precis som Socket.io gör.
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

// Signerar om ett block som om angriparen hade ändrat innehållet och försökt
// dölja det. Hashen räknas om så att den stämmer med den nya datan.
function signeraOmSomAngripare(block) {
  block.hash = block.calculateHash();
  block.signature = signHash(block.hash, angripare.privateKey);
  block.publicKey = angripare.publicKey;
}

test('nya block signeras med nodens nyckel', () => {
  const block = kedjaMed(1).getLatestBlock();

  assert.strictEqual(block.publicKey, nod.publicKey);
  assert.strictEqual(typeof block.signature, 'string');
  assert.strictEqual(block.hasValidSignature(), true);
});

test('genesis är osignerat', () => {
  const genesis = new Blockchain().chain[0];

  assert.strictEqual(genesis.signature, null);
  assert.strictEqual(genesis.publicKey, null);
});

test('en signerad kedja är giltig', () => {
  assert.strictEqual(kedjaMed(3).isChainValid(), true);
});

// Signaturen ligger utanför hashen. Gjorde den inte det skulle nästa blocks
// previousHash peka på en hash som ändrades i samma stund blocket signerades.
test('signeringen ändrar inte blockets hash', () => {
  const block = new Block({
    index: 1,
    timestamp: auditEvent.timestamp,
    data: { ...auditEvent },
    previousHash: 'abc',
  });
  const innan = block.hash;

  block.sign();

  assert.strictEqual(block.hash, innan);
  assert.strictEqual(block.hash, block.calculateHash());
});

test('ett osignerat block i kedjan nekas', () => {
  const blockchain = kedjaMed(1);
  const last = blockchain.getLatestBlock();

  last.signature = null;
  last.publicKey = null;

  assert.strictEqual(blockchain.isChainValid(), false);
});

// Kärnan i hela signeringen. Angriparen ändrar data, räknar om hashen så att
// blocket hashar korrekt, och signerar om med sin egen nyckel. Utan betrodda
// nycklar hade det här gått igenom.
test('ett block som signerats om av en okänd nyckel nekas', () => {
  const blockchain = kedjaMed(1);
  const last = blockchain.getLatestBlock();

  last.data.patientId = 8;
  signeraOmSomAngripare(last);

  assert.strictEqual(last.hasValidHash(), true);
  assert.strictEqual(verifyHash(last.hash, last.signature, last.publicKey), true);
  assert.strictEqual(blockchain.isChainValid(), false);
});

test('samma angrepp mitt i kedjan nekas också', () => {
  const blockchain = kedjaMed(3);
  const mitten = blockchain.chain[2];

  mitten.data.patientId = 8;
  signeraOmSomAngripare(mitten);

  assert.strictEqual(blockchain.isChainValid(), false);
});

test('en ändrad signatur nekas', () => {
  const blockchain = kedjaMed(1);
  const last = blockchain.getLatestBlock();

  // Byter ett tecken i signaturen utan att ändra längden.
  last.signature = `${last.signature[0] === 'A' ? 'B' : 'A'}${last.signature.slice(1)}`;

  assert.strictEqual(blockchain.isChainValid(), false);
});

// En signatur hör till exakt en hash. Annars skulle en giltig signatur kunna
// återanvändas på ett annat block.
test('en signatur från ett annat block nekas', () => {
  const blockchain = kedjaMed(2);
  const första = blockchain.chain[1];
  const andra = blockchain.chain[2];

  andra.signature = första.signature;

  assert.strictEqual(blockchain.isChainValid(), false);
});

// Skiljer de två kontrollerna åt. Här är nyckeln betrodd, men signaturen är
// inte gjord med den. Det ska räcka för att neka.
test('en betrodd nyckel med signatur som inte hör till den nekas', (t) => {
  configure({ privateKey: nod.privateKey, trustedKeys: [angripare.publicKey] });
  t.after(grundkonfiguration);

  const blockchain = kedjaMed(1);
  const last = blockchain.getLatestBlock();

  last.publicKey = angripare.publicKey;

  assert.strictEqual(isTrusted(last.publicKey), true);
  assert.strictEqual(blockchain.isChainValid(), false);
});

test('ett genesis med påhängd signatur nekas', () => {
  const blockchain = new Blockchain();
  const genesis = blockchain.chain[0];

  genesis.signature = signHash(genesis.hash, nod.privateKey);
  genesis.publicKey = nod.publicKey;

  assert.strictEqual(genesis.hasValidHash(), true);
  assert.strictEqual(blockchain.isChainValid(), false);
});

test('signatur och publik nyckel följer med över nätet', () => {
  const node1 = kedjaMed(2);
  const node2 = new Blockchain();

  assert.strictEqual(node2.replaceChain(överNätet(node1.chain)), true);
  assert.strictEqual(node2.getLatestBlock().signature, node1.getLatestBlock().signature);
  assert.strictEqual(node2.getLatestBlock().publicKey, nod.publicKey);
});

test('en längre kedja med ett omsignerat block nekas över nätet', () => {
  const node1 = kedjaMed(3);
  const node2 = new Blockchain();

  node1.chain[2].data.patientId = 8;
  signeraOmSomAngripare(node1.chain[2]);

  assert.strictEqual(node2.replaceChain(överNätet(node1.chain)), false);
  assert.strictEqual(node2.chain.length, 1);
});

test('ett enskilt osignerat block från en annan nod nekas', () => {
  const node1 = kedjaMed(1);
  const node2 = new Blockchain();
  const block = överNätet([node1.getLatestBlock()])[0];

  block.signature = null;
  block.publicKey = null;

  assert.strictEqual(node2.addReceivedBlock(block), false);
  assert.strictEqual(node2.chain.length, 1);
});

test('ett enskilt block signerat av en okänd nyckel nekas', () => {
  const node1 = kedjaMed(1);
  const node2 = new Blockchain();

  node1.getLatestBlock().data.patientId = 8;
  signeraOmSomAngripare(node1.getLatestBlock());

  assert.strictEqual(node2.addReceivedBlock(överNätet([node1.getLatestBlock()])[0]), false);
  assert.strictEqual(node2.chain.length, 1);
});

// Allt som kommer utifrån ska ge false, aldrig ett kast som tar ner noden.
test('verifyHash returnerar false på trasig indata i stället för att kasta', () => {
  const block = kedjaMed(1).getLatestBlock();
  const skräp = [null, undefined, '', 42, {}, [], 'inte base64!', 'A'.repeat(5000)];

  for (const värde of skräp) {
    assert.strictEqual(verifyHash(block.hash, värde, nod.publicKey), false);
    assert.strictEqual(verifyHash(block.hash, block.signature, värde), false);
  }
});

test('ett block med signatur som inte är en sträng avvisas av fromJSON', () => {
  const block = överNätet([kedjaMed(1).getLatestBlock()])[0];

  assert.strictEqual(Block.fromJSON({ ...block, signature: 42 }), null);
  assert.strictEqual(Block.fromJSON({ ...block, signature: { a: 1 } }), null);
  assert.strictEqual(Block.fromJSON({ ...block, publicKey: ['a'] }), null);
  assert.strictEqual(Block.fromJSON({ ...block, signature: 'A'.repeat(5000) }), null);
});

test('den publika nyckeln kan räknas fram ur den privata', () => {
  assert.strictEqual(publicKeyFromPrivate(nod.privateKey), nod.publicKey);
});

test('nodens egen nyckel är alltid betrodd hos sig själv', () => {
  assert.strictEqual(isTrusted(getSigningKey().publicKey), true);
  assert.strictEqual(isTrusted(angripare.publicKey), false);
});

// Signaturen görs över en domänsträng plus hashen. En signatur över bara hashen
// ska därför inte godtas, annars säger signaturen inget om vad den signerar och
// skulle kunna flyttas hit från ett annat sammanhang som använder samma nyckel.
test('en signatur över bara hashen, utan domänprefix, nekas', () => {
  const blockchain = kedjaMed(1);
  const last = blockchain.getLatestBlock();

  const key = createPrivateKey({
    key: Buffer.from(nod.privateKey, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });

  last.signature = sign(null, Buffer.from(last.hash, 'utf8'), key).toString('base64');

  assert.strictEqual(verifyHash(last.hash, last.signature, nod.publicKey), false);
  assert.strictEqual(blockchain.isChainValid(), false);
});

// Varje block i en mottagen kedja kostar en hashomräkning och en
// signaturverifiering, och arbetet är synkront. Utan tak kan en granne låsa
// nodens event loop genom att skicka en enorm kedja.
test('en orimligt lång kedja avvisas utan att valideras', () => {
  const node2 = new Blockchain();
  const block = JSON.parse(JSON.stringify(kedjaMed(1).getLatestBlock()));
  const förLång = [new Blockchain().chain[0], ...Array(10000).fill(block)];

  assert.strictEqual(Blockchain.fromJSON(förLång), null);
  assert.strictEqual(node2.replaceChain(förLång), false);
});

// Skälet kommer från replaceChain, som redan gått igenom kedjan. Räknades det ut
// i efterhand skulle kedjan valideras flera gånger per mottaget meddelande.
test('replaceChain talar om varför en kedja nekades', () => {
  const node2 = new Blockchain();
  const skäl = [];
  const onReject = (orsak) => skäl.push(orsak);

  const omsignerad = kedjaMed(2);
  omsignerad.chain[2].data.patientId = 8;
  signeraOmSomAngripare(omsignerad.chain[2]);

  node2.replaceChain(överNätet(omsignerad.chain), { onReject });
  node2.replaceChain('inte en kedja', { onReject });
  node2.replaceChain(överNätet(new Blockchain().chain), { onReject });

  assert.match(skäl[0], /nyckel vi inte litar på/);
  assert.match(skäl[1], /gick inte att läsa/);
  assert.match(skäl[2], /lika lång fork/);
});

test('en trasig privat nyckel stoppar konfigurationen i stället för att tystna', (t) => {
  t.after(grundkonfiguration);

  assert.throws(() => configure({ privateKey: 'inte en nyckel' }));
  assert.throws(() => configure({ privateKey: nod.privateKey, trustedKeys: [42] }));
});
