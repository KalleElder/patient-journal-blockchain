const test = require('node:test');
const assert = require('node:assert');

const Blockchain = require('./Blockchain');
const { sha256 } = require('./hash');
const {
  merkleRoot,
  merkleProof,
  verifyMerkleProof,
  MAX_BEVISLÄNGD,
  leafHash,
  nodeHash,
} = require('./merkle');

const auditEvent = Object.freeze({
  userId: 1,
  patientId: 7,
  role: 'DOCTOR',
  action: 'READ_JOURNAL',
  timestamp: '2026-09-07T12:00:00.000Z',
});

// Hashar som ser ut som blockhashar men går att skriva ut i ett test. Trädet
// bryr sig bara om att löven är hashar, inte var de kommer ifrån.
function fejkHashar(antal) {
  return Array.from({ length: antal }, (_, i) => sha256(`block-${i}`));
}

function kedjaMed(antalAuditBlock) {
  const blockchain = new Blockchain();

  for (let i = 0; i < antalAuditBlock; i += 1) {
    blockchain.addBlock({ ...auditEvent, userId: i + 1 });
  }

  return blockchain;
}

// Bygger ett bevis av valfri längd tillsammans med den rot det leder till, så
// att ett långt bevis kan vara korrekt och inte bara skräp.
function byggBevis(blockHash, antalSteg) {
  const bevis = [];
  let aktuell = leafHash(blockHash);

  for (let i = 0; i < antalSteg; i += 1) {
    const syskon = sha256(`syskon-${i}`);

    bevis.push({ side: 'right', hash: syskon });
    aktuell = nodeHash(aktuell, syskon);
  }

  return { bevis, root: aktuell };
}

// Roten över ett enda block får inte bli blockets egen hash. Annars kan en
// blockhash plockas ur en kedja och presenteras som en rot, och tvärtom.
test('roten över ett enda block är inte blockets hash', () => {
  const [hash] = fejkHashar(1);
  const root = merkleRoot([hash]);

  assert.match(root, /^[0-9a-f]{64}$/);
  assert.notStrictEqual(root, hash);
  assert.strictEqual(root, leafHash(hash));
});

test('samma block i samma ordning ger alltid samma rot', () => {
  const hashar = fejkHashar(6);

  assert.strictEqual(merkleRoot(hashar), merkleRoot([...hashar]));
});

// Att jämföra två anrop bevisar bara att funktionen är konsekvent med sig själv.
// Fasta värden låser formatet: prefixen, ordningen mellan syskon och hur en udda
// nod lyfts upp. Ändras något av det ändras hashen nedan, och då slutar noder
// med olika version av koden att komma fram till samma rot.
test('roten över en känd lista har ett kanoniskt värde', () => {
  assert.strictEqual(
    merkleRoot(fejkHashar(3)),
    '60d368c136340dcfab554b6cefd3d57db91ec75f4376dc2efac3c18d5ec40897',
  );

  assert.strictEqual(
    merkleRoot(fejkHashar(1)),
    '1fdec97cce984bb3906d5673e35542607de16b3f6046faa023b1300c810c3f1b',
  );
});

test('roten ändras när två block byter plats', () => {
  const hashar = fejkHashar(4);
  const omkastad = [hashar[1], hashar[0], hashar[2], hashar[3]];

  assert.notStrictEqual(merkleRoot(hashar), merkleRoot(omkastad));
});

// Den klassiska Merkle-buggen. Paras den sista noden i ett udda lager med sig
// själv får en kedja och samma kedja med sista blocket dubblerat samma rot, och
// då kan två olika historiker inte skiljas åt.
test('en dubblerad sista hash ger inte samma rot som listan utan dubblering', () => {
  const hashar = fejkHashar(3);

  assert.notStrictEqual(merkleRoot(hashar), merkleRoot([...hashar, hashar[2]]));
});

// Varje löv ska få exakt samma behandling. Första och sista lövet är de som
// lättast hamnar utanför, det första eftersom det ligger först i loopen och det
// sista eftersom det i udda lager lyfts upp utan syskon.
test('varje block har ett bevis som verifierar, oavsett antal block och plats', () => {
  for (let antal = 1; antal <= 9; antal += 1) {
    const hashar = fejkHashar(antal);
    const root = merkleRoot(hashar);

    hashar.forEach((hash, index) => {
      assert.strictEqual(
        verifyMerkleProof({ blockHash: hash, proof: merkleProof(hashar, index), root }),
        true,
        `block ${index} av ${antal}`,
      );
    });
  }
});

test('ett bevis gäller bara för sitt eget block', () => {
  const hashar = fejkHashar(5);
  const root = merkleRoot(hashar);
  const bevis = merkleProof(hashar, 2);

  assert.strictEqual(verifyMerkleProof({ blockHash: hashar[3], proof: bevis, root }), false);
  assert.strictEqual(
    verifyMerkleProof({ blockHash: sha256('ett block som aldrig låg i kedjan'), proof: bevis, root }),
    false,
  );
});

test('ett manipulerat steg i beviset verifierar inte', () => {
  const hashar = fejkHashar(5);
  const root = merkleRoot(hashar);
  const bevis = merkleProof(hashar, 2);

  const annatSyskon = bevis.map((steg, i) => (i === 0 ? { ...steg, hash: sha256('påhittat') } : steg));
  const annanSida = bevis.map((steg, i) => (
    i === 0 ? { ...steg, side: steg.side === 'left' ? 'right' : 'left' } : steg
  ));

  assert.strictEqual(verifyMerkleProof({ blockHash: hashar[2], proof: annatSyskon, root }), false);
  assert.strictEqual(verifyMerkleProof({ blockHash: hashar[2], proof: annanSida, root }), false);
});

test('ett bevis kan varken förkortas eller förlängas', () => {
  const hashar = fejkHashar(5);
  const root = merkleRoot(hashar);
  const bevis = merkleProof(hashar, 2);

  const förkortat = bevis.slice(0, -1);
  const förlängt = [...bevis, { side: 'right', hash: sha256('extra steg') }];

  assert.strictEqual(verifyMerkleProof({ blockHash: hashar[2], proof: förkortat, root }), false);
  assert.strictEqual(verifyMerkleProof({ blockHash: hashar[2], proof: förlängt, root }), false);
});

// Den som kan de två grenarna under roten kan räkna fram roten själv. Ett bevis
// får ändå inte gå att bygga av dem, eftersom verifieringen alltid lövhashar det
// den får och en inre nod därför aldrig kan gå av som ett block.
test('en inre nods hash kan inte skickas in som ett block', () => {
  const hashar = fejkHashar(4);
  const root = merkleRoot(hashar);

  // De två grenarna under roten, hämtade ur riktiga bevis.
  const vänsterGren = merkleProof(hashar, 2)[1].hash;
  const högerGren = merkleProof(hashar, 0)[1].hash;

  assert.strictEqual(nodeHash(vänsterGren, högerGren), root);
  assert.strictEqual(
    verifyMerkleProof({ blockHash: vänsterGren, proof: [{ side: 'right', hash: högerGren }], root }),
    false,
  );
});

test('varje block i en riktig kedja har ett bevis mot kedjans rot', () => {
  const blockchain = kedjaMed(4);
  const root = blockchain.getMerkleRoot();

  blockchain.chain.forEach((block, index) => {
    assert.strictEqual(
      verifyMerkleProof({ blockHash: block.hash, proof: blockchain.getMerkleProof(index), root }),
      true,
      `block ${index}`,
    );
  });
});

// Manipulation där hashen räknas om. Genesis och sista blocket ingår, eftersom
// de är de som lättast slinker igenom.
test('kedjans rot ändras när ett block ändras och hashen räknas om', () => {
  for (const index of [0, 1, 2, 3]) {
    const blockchain = kedjaMed(3);
    const före = blockchain.getMerkleRoot();
    const block = blockchain.chain[index];

    block.data.action = 'DELETE_JOURNAL_ENTRY';
    block.hash = block.calculateHash();

    assert.notStrictEqual(blockchain.getMerkleRoot(), före, `block ${index}`);
  }
});

// Andra varianten av samma manipulation: data ändras men den sparade hashen
// ligger kvar. Roten är en sammanfattning av blockens hashar, så den ser inte
// den ändringen. Det är hasValidHash() i valideringen som fångar den, och
// testet visar att arbetsfördelningen faktiskt håller.
test('en ändring där den sparade hashen ligger kvar syns inte i roten men gör kedjan ogiltig', () => {
  const blockchain = kedjaMed(3);
  const före = blockchain.getMerkleRoot();

  blockchain.chain[2].data.action = 'DELETE_JOURNAL_ENTRY';

  assert.strictEqual(blockchain.getMerkleRoot(), före);
  assert.strictEqual(blockchain.isChainValid(), false);
});

test('roten ändras när ett block läggs till och gamla bevis slutar gälla', () => {
  const blockchain = kedjaMed(1);
  const root = blockchain.getMerkleRoot();
  const bevis = blockchain.getMerkleProof(1);
  const { hash } = blockchain.chain[1];

  assert.strictEqual(verifyMerkleProof({ blockHash: hash, proof: bevis, root }), true);

  blockchain.addBlock({ ...auditEvent, userId: 2, role: 'NURSE' });
  const nyRoot = blockchain.getMerkleRoot();

  assert.notStrictEqual(nyRoot, root);
  assert.strictEqual(verifyMerkleProof({ blockHash: hash, proof: bevis, root: nyRoot }), false);
  assert.strictEqual(
    verifyMerkleProof({ blockHash: hash, proof: blockchain.getMerkleProof(1), root: nyRoot }),
    true,
  );
});

test('en kedja utan block ger ingen rot och inga bevis', () => {
  const blockchain = kedjaMed(1);

  assert.strictEqual(blockchain.getMerkleProof(2), null);
  assert.strictEqual(blockchain.getMerkleProof(-1), null);

  const tom = new Blockchain();
  tom.chain = [];

  assert.strictEqual(tom.getMerkleRoot(), null);
  assert.strictEqual(tom.getMerkleProof(0), null);
});

// Listan kan komma utifrån, och då ska svaret vara null i stället för ett kast.
test('merkleRoot ger null för en tom eller trasig lista', () => {
  const [hash] = fejkHashar(1);

  const fall = [
    undefined,
    null,
    'en sträng',
    42,
    {},
    [],
    [hash, 'inte en hash'],
    [hash, null],
    [hash, 42],
    [hash.toUpperCase()],
    [`${hash}0`],
    [hash.slice(0, 63)],
  ];

  for (const indata of fall) {
    assert.strictEqual(merkleRoot(indata), null, JSON.stringify(indata));
  }
});

test('merkleProof ger null för ett index eller en lista som inte går att använda', () => {
  const hashar = fejkHashar(3);

  for (const index of [-1, 3, 1.5, '1', null, undefined, NaN, Infinity]) {
    assert.strictEqual(merkleProof(hashar, index), null, String(index));
  }

  assert.strictEqual(merkleProof(['inte en hash'], 0), null);
  assert.strictEqual(merkleProof([], 0), null);
  assert.strictEqual(merkleProof(null, 0), null);
});

test('verifyMerkleProof ger false för trasig indata i stället för att kasta', () => {
  const hashar = fejkHashar(4);
  const root = merkleRoot(hashar);
  const bevis = merkleProof(hashar, 0);
  const blockHash = hashar[0];

  const fall = [
    undefined,
    null,
    'en sträng',
    42,
    {},
    { blockHash, proof: bevis },
    { blockHash, root },
    { proof: bevis, root },
    { blockHash: 'inte en hash', proof: bevis, root },
    { blockHash, proof: bevis, root: 'inte en hash' },
    { blockHash, proof: 'inte en lista', root },
    { blockHash, proof: [null], root },
    { blockHash, proof: ['inte ett steg'], root },
    { blockHash, proof: [{ hash: hashar[1] }], root },
    { blockHash, proof: [{ side: 'upp', hash: hashar[1] }], root },
    { blockHash, proof: [{ side: 'right' }], root },
    { blockHash, proof: [{ side: 'right', hash: 42 }], root },
  ];

  for (const indata of fall) {
    assert.strictEqual(verifyMerkleProof(indata), false, JSON.stringify(indata));
  }
});

// Ett korrekt bevis vid taket ska gå igenom, ett steg längre ska avvisas utan
// att räknas igenom. Båda bevisen är riktiga och leder till sin rot, så det är
// längden och inget annat som skiljer dem.
test('ett bevis vid taket verifierar men ett steg längre avvisas', () => {
  const blockHash = sha256('block vid taket');
  const vidTaket = byggBevis(blockHash, MAX_BEVISLÄNGD);
  const överTaket = byggBevis(blockHash, MAX_BEVISLÄNGD + 1);

  assert.strictEqual(
    verifyMerkleProof({ blockHash, proof: vidTaket.bevis, root: vidTaket.root }),
    true,
  );
  assert.strictEqual(
    verifyMerkleProof({ blockHash, proof: överTaket.bevis, root: överTaket.root }),
    false,
  );
});
