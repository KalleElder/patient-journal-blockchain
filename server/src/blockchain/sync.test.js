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

// Två kedjor som är lika långa men har olika innehåll är en fork. Märket går in
// i data, så hasharna skiljer sig även om båda kedjorna byggs i samma
// millisekund och därmed får samma timestamp.
function forkMed(antalBlock, märke) {
  const blockchain = new Blockchain();

  for (let i = 0; i < antalBlock; i += 1) {
    blockchain.addBlock({ ...auditEvent, userId: i + 1, patientId: märke });
  }

  return blockchain;
}

// Två forkar av samma längd, den med lägst hash på sista blocket först. Vilken
// av dem som vinner går inte att veta i förväg, eftersom hashen följer av
// innehållet.
function sorteradeForkar(antalBlock) {
  const a = forkMed(antalBlock, 7);
  const b = forkMed(antalBlock, 8);

  return a.getLatestBlock().hash < b.getLatestBlock().hash ? [a, b] : [b, a];
}

// Bygger en fork vars sista block hamnar på rätt sida av en given hash. Behövs
// när ett test ska avgöras av valideringen och inte av tiebreaken, alltså när
// kandidaten måste vinna hash-jämförelsen för att testet ska bevisa något.
function forkMedHash(antalBlock, duger) {
  for (let märke = 1; märke <= 200; märke += 1) {
    const kandidat = forkMed(antalBlock, märke);

    if (duger(kandidat.getLatestBlock().hash)) {
      return kandidat;
    }
  }

  throw new Error('hittade ingen fork med den hash testet behöver');
}

// Ändrar ett block och signerar om det med den nyckel noden litar på, alltså som
// om någon med nodens egen nyckel skrev om historiken. Då stämmer både hashen
// och signaturen, och varken hash- eller signaturkontrollen fångar något.
// previousHash-länken och index är det enda som återstår, och det är just de
// kontrollerna som annars aldrig prövas: en angripare utan betrodd nyckel stoppas
// alltid av signaturen först.
function signeraOmMedBetroddNyckel(plainBlock) {
  const block = Block.fromJSON(plainBlock);

  block.hash = block.calculateHash();
  block.sign();

  plainBlock.hash = block.hash;
  plainBlock.signature = block.signature;
  plainBlock.publicKey = block.publicKey;
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

// Två giltiga kedjor med exakt samma längd är en fork. Där avgör hashen på
// sista blocket och den lägsta vinner.
test('en lika lång fork med lägre hash på sista blocket ersätter den lokala kedjan', () => {
  const [lägre, högre] = sorteradeForkar(2);
  const vinnande = lägre.getLatestBlock().hash;

  assert.strictEqual(högre.replaceChain(överNätet(lägre.chain)), true);
  assert.strictEqual(högre.chain.length, 3);
  assert.strictEqual(högre.getLatestBlock().hash, vinnande);
  assert.strictEqual(högre.isChainValid(), true);
});

test('en lika lång fork med högre hash på sista blocket nekas', () => {
  const [lägre, högre] = sorteradeForkar(2);
  const eget = lägre.getLatestBlock().hash;

  assert.strictEqual(lägre.replaceChain(överNätet(högre.chain)), false);
  assert.strictEqual(lägre.chain.length, 3);
  assert.strictEqual(lägre.getLatestBlock().hash, eget);
});

// Samma kedja tillbaka är ingen fork. Byttes den ut skulle två noder kunna
// skicka samma kedja mellan sig i all oändlighet.
test('en identisk kedja nekas', () => {
  const nod = forkMed(2, 7);
  const eget = nod.getLatestBlock().hash;

  assert.strictEqual(nod.replaceChain(överNätet(nod.chain)), false);
  assert.strictEqual(nod.chain.length, 3);
  assert.strictEqual(nod.getLatestBlock().hash, eget);
});

// Hela poängen med en tiebreak: utfallet får inte bero på vem som hann skicka
// först, annars konvergerar noderna aldrig.
test('båda noderna hamnar på samma kedja när en fork utbyts i båda riktningar', () => {
  const [lägre, högre] = sorteradeForkar(2);
  const vinnande = lägre.getLatestBlock().hash;

  högre.replaceChain(överNätet(lägre.chain));
  lägre.replaceChain(överNätet(högre.chain));

  assert.strictEqual(lägre.getLatestBlock().hash, vinnande);
  assert.strictEqual(högre.getLatestBlock().hash, vinnande);
});

// Tiebreaken gäller bara vid exakt samma längd. Vinner en kortare kedja på en
// låg hash kan en granne skriva om vår historik med en kedja som är sämre än
// den vi redan har.
test('en kortare kedja nekas även när dess sista block har lägre hash', () => {
  const vår = kedjaMed(4);
  const eget = vår.getLatestBlock().hash;
  const kortare = forkMedHash(2, (hash) => hash < eget);

  assert.strictEqual(vår.replaceChain(överNätet(kortare.chain)), false);
  assert.strictEqual(vår.chain.length, 5);
  assert.strictEqual(vår.getLatestBlock().hash, eget);
});

// P2P-lagret loggar skälet, och då ska en fork gå att skilja från en kedja som
// bara är kortare. Det är två helt olika situationer att felsöka.
test('replaceChain skiljer en fork från en kortare kedja i avslagsskälet', () => {
  const [lägre, högre] = sorteradeForkar(2);
  const skäl = [];
  const onReject = (orsak) => skäl.push(orsak);

  lägre.replaceChain(överNätet(högre.chain), { onReject });
  lägre.replaceChain(överNätet(new Blockchain().chain), { onReject });

  assert.match(skäl[0], /lika lång fork/);
  assert.match(skäl[1], /kortare än vår egen/);
});

// En granne kan sätta vilken hash som helst på sitt sista block och därmed
// vinna jämförelsen. Det ska inte ge något, eftersom hashen kontrolleras mot
// blockets innehåll efteråt.
test('en lika lång fork med påhittat låg hash på sista blocket nekas', () => {
  const angripare = forkMed(2, 7);
  const vår = forkMed(2, 8);
  const eget = vår.getLatestBlock().hash;

  const skickad = överNätet(angripare.chain);
  skickad[2].hash = '0'.repeat(64);

  assert.strictEqual(vår.replaceChain(skickad), false);
  assert.strictEqual(vår.getLatestBlock().hash, eget);
});

// En fork som vinner tiebreaken går igenom exakt samma validering som en längre
// kedja. Först den vanligaste manipulationen, där innehållet ändras och den
// gamla hashen ligger kvar.
test('en lika lång fork som vinner på hash nekas när data har ändrats', () => {
  const skickad = överNätet(forkMed(3, 7).chain);
  skickad[2].data.userId = 99;

  const vår = forkMedHash(3, (hash) => hash > skickad[3].hash);
  const eget = vår.getLatestBlock().hash;

  assert.strictEqual(vår.replaceChain(skickad), false);
  assert.strictEqual(vår.getLatestBlock().hash, eget);
});

// Sedan den smartare varianten, där hashen räknas om så att blocket ser giltigt
// ut. Då pekar nästa block fortfarande på den gamla hashen och länken brister.
test('en lika lång fork som vinner på hash nekas när data ändrats och hashen räknats om', () => {
  const skickad = överNätet(forkMed(3, 7).chain);
  skickad[2].data.userId = 99;
  skickad[2].hash = Block.fromJSON(skickad[2]).calculateHash();

  const vår = forkMedHash(3, (hash) => hash > skickad[3].hash);
  const eget = vår.getLatestBlock().hash;

  assert.strictEqual(vår.replaceChain(skickad), false);
  assert.strictEqual(vår.getLatestBlock().hash, eget);
});

// Sista blocket avgör tiebreaken och är därmed det enda block en angripare
// tjänar något på att räkna om. Det får inte komma undan med färre kontroller
// än blocken före, som skyddas av nästa blocks previousHash.
test('en lika lång fork nekas när sista blockets data ändrats och hashen ligger kvar', () => {
  const skickad = överNätet(forkMed(3, 7).chain);
  skickad[3].data.userId = 99;

  const vår = forkMedHash(3, (hash) => hash > skickad[3].hash);
  const eget = vår.getLatestBlock().hash;

  assert.strictEqual(vår.replaceChain(skickad), false);
  assert.strictEqual(vår.getLatestBlock().hash, eget);
});

test('en lika lång fork nekas när sista blockets data ändrats och hashen räknats om', () => {
  const skickad = överNätet(forkMed(3, 7).chain);
  skickad[3].data.userId = 99;
  skickad[3].hash = Block.fromJSON(skickad[3]).calculateHash();

  const vår = forkMedHash(3, (hash) => hash > skickad[3].hash);
  const eget = vår.getLatestBlock().hash;

  assert.strictEqual(vår.replaceChain(skickad), false);
  assert.strictEqual(vår.getLatestBlock().hash, eget);
});

// Med signering på plats stoppas en vanlig angripare alltid av signaturen, och
// då hinner previousHash-kontrollen aldrig säga något. Den behövs mot den som
// har en nyckel vi litar på, till exempel en komprometterad nod, och först då
// syns det om länken faktiskt kontrolleras.
test('en lika lång fork nekas när ett block ändrats och signerats om med betrodd nyckel', () => {
  const skickad = överNätet(forkMed(3, 7).chain);
  skickad[2].data.userId = 99;
  signeraOmMedBetroddNyckel(skickad[2]);

  const vår = forkMedHash(3, (hash) => hash > skickad[3].hash);
  const eget = vår.getLatestBlock().hash;

  // Blocket hashar och signerar korrekt. Bara den brutna länken till nästa
  // block avslöjar det.
  assert.strictEqual(Block.fromJSON(skickad[2]).hasValidHash(), true);
  assert.strictEqual(Block.fromJSON(skickad[2]).hasValidSignature(), true);

  assert.strictEqual(vår.replaceChain(skickad), false);
  assert.strictEqual(vår.getLatestBlock().hash, eget);
});

// Sista blocket har ingen efterföljare vars previousHash kan avslöja en ändring,
// så det är där en felaktig länk lättast slinker igenom.
test('en lika lång fork nekas när sista blockets previousHash ändrats och signerats om', () => {
  const skickad = överNätet(forkMed(3, 7).chain);
  skickad[3].previousHash = 'a'.repeat(64);
  signeraOmMedBetroddNyckel(skickad[3]);

  const vår = forkMedHash(3, (hash) => hash > skickad[3].hash);
  const eget = vår.getLatestBlock().hash;

  assert.strictEqual(vår.replaceChain(skickad), false);
  assert.strictEqual(vår.getLatestBlock().hash, eget);
});

// Index är det sista som håller kedjan i ordning när både hash, signatur och
// länk stämmer. Sista blocket är enda stället där ett ändrat index inte redan
// fångas av nästa blocks previousHash.
test('en lika lång fork nekas när sista blockets index ändrats och signerats om', () => {
  const skickad = överNätet(forkMed(3, 7).chain);
  skickad[3].index = 7;
  signeraOmMedBetroddNyckel(skickad[3]);

  const vår = forkMedHash(3, (hash) => hash > skickad[3].hash);
  const eget = vår.getLatestBlock().hash;

  assert.strictEqual(vår.replaceChain(skickad), false);
  assert.strictEqual(vår.getLatestBlock().hash, eget);
});

// Samma lucka i den längre kedjans väg, där ingen tiebreak är inblandad.
test('en längre kedja nekas när sista blockets index ändrats och signerats om', () => {
  const skickad = överNätet(kedjaMed(3).chain);
  skickad[3].index = 7;
  signeraOmMedBetroddNyckel(skickad[3]);

  const vår = new Blockchain();

  assert.strictEqual(vår.replaceChain(skickad), false);
  assert.strictEqual(vår.chain.length, 1);
});

// Genesis saknar föregående block att jämföras mot och glöms därför lättast.
test('en lika lång fork med manipulerat genesis block nekas', () => {
  const skickad = överNätet(forkMed(3, 7).chain);
  skickad[0].data.action = 'FEJKAD_GENESIS';

  const vår = forkMedHash(3, (hash) => hash > skickad[3].hash);
  const eget = vår.getLatestBlock().hash;

  assert.strictEqual(vår.replaceChain(skickad), false);
  assert.strictEqual(vår.getLatestBlock().hash, eget);
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
