const { sha256 } = require('./hash');

// Löv och inre noder hashas med olika prefix, så att ett löv och en inre nod
// aldrig kan hashas likadant. Prefixen versionerar samtidigt formatet, precis
// som signeringens 'patient-journal-audit-v1:'. De ingår i roten, så en ändring
// av dem ändrar varje rot och varje bevis.
const LEAF_PREFIX = 'patient-journal-merkle-leaf-v1:';
const NODE_PREFIX = 'patient-journal-merkle-node-v1:';

// Tak på hur långt ett bevis får vara. Ett bevis kan komma utifrån, och varje
// steg kostar en hashning. Med kedjetaket i Blockchain.js på 10000 block blir
// ett riktigt bevis som mest 14 steg, så taket ligger långt över allt vi kan
// producera själva men är bundet.
const MAX_BEVISLÄNGD = 64;

const HASH_FORM = /^[0-9a-f]{64}$/;

function ärHash(värde) {
  return typeof värde === 'string' && HASH_FORM.test(värde);
}

function leafHash(blockHash) {
  return sha256(LEAF_PREFIX + blockHash);
}

// Hasharna är alltid 64 tecken, så den enkla konkateneringen kan inte tolkas
// på två sätt.
function nodeHash(vänster, höger) {
  return sha256(NODE_PREFIX + vänster + höger);
}

// Ett lager i taget uppåt. Är antalet noder udda lyfts den sista upp
// oförändrad i stället för att paras med sig själv. Dubbleringen är den
// klassiska Merkle-buggen: [A, B, C] och [A, B, C, C] får då samma rot, och två
// olika kedjor blir omöjliga att skilja på.
function nästaLager(lager) {
  const nytt = [];

  for (let i = 0; i < lager.length; i += 2) {
    nytt.push(i + 1 < lager.length ? nodeHash(lager[i], lager[i + 1]) : lager[i]);
  }

  return nytt;
}

// Roten över en lista av blockhashar. Returnerar null om listan är tom eller
// innehåller något som inte är en hash, eftersom listan kan komma utifrån.
function merkleRoot(hashar) {
  if (!Array.isArray(hashar) || hashar.length === 0 || !hashar.every(ärHash)) {
    return null;
  }

  let lager = hashar.map(leafHash);

  while (lager.length > 1) {
    lager = nästaLager(lager);
  }

  return lager[0];
}

// Syskonen på vägen från ett löv upp till roten. Varje steg säger vilken sida
// syskonet ligger på, så beviset kan verifieras utan att veta hur många block
// kedjan har. En nod som lyfts upp utan syskon ger inget steg.
//
// Returnerar null om listan eller indexet inte går att använda.
function merkleProof(hashar, index) {
  if (!Array.isArray(hashar)
    || !hashar.every(ärHash)
    || !Number.isInteger(index)
    || index < 0
    || index >= hashar.length) {
    return null;
  }

  const bevis = [];
  let lager = hashar.map(leafHash);
  let plats = index;

  while (lager.length > 1) {
    const ärVänster = plats % 2 === 0;
    const syskon = ärVänster ? plats + 1 : plats - 1;

    if (syskon < lager.length) {
      bevis.push({ side: ärVänster ? 'right' : 'left', hash: lager[syskon] });
    }

    lager = nästaLager(lager);
    plats = Math.floor(plats / 2);
  }

  return bevis;
}

// Sant om blockHash låg som löv i det träd som gav root. Beviset räknas ihop
// nedifrån och upp och jämförs med roten.
//
// Detta binder blockets hash till kedjan, inte blockets innehåll till hashen.
// Den som tar emot ett block måste därför fortfarande kontrollera
// hasValidHash() och hasValidSignature(), precis som vid vanlig validering.
//
// Allt kommer utifrån, så allt som inte går att använda ger false.
function verifyMerkleProof(bevisning) {
  if (bevisning === null || typeof bevisning !== 'object') {
    return false;
  }

  const { blockHash, proof, root } = bevisning;

  if (!ärHash(blockHash)
    || !ärHash(root)
    || !Array.isArray(proof)
    || proof.length > MAX_BEVISLÄNGD) {
    return false;
  }

  let aktuell = leafHash(blockHash);

  for (const steg of proof) {
    if (steg === null || typeof steg !== 'object' || !ärHash(steg.hash)) {
      return false;
    }

    if (steg.side !== 'left' && steg.side !== 'right') {
      return false;
    }

    aktuell = steg.side === 'left'
      ? nodeHash(steg.hash, aktuell)
      : nodeHash(aktuell, steg.hash);
  }

  return aktuell === root;
}

module.exports = {
  merkleRoot,
  merkleProof,
  verifyMerkleProof,
  MAX_BEVISLÄNGD,
  // Exporteras för att testerna ska kunna bygga träd och bevis själva i stället
  // för att lita på funktionerna de kontrollerar.
  leafHash,
  nodeHash,
};
