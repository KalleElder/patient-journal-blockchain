// Kort demonstration av det de två andra demoscripten inte visar:
// signering, Merkle Tree och fork mellan lika långa kedjor.
//
// Körs från server/ med:
//   node src/blockchain/demoAvancerat.js

const Blockchain = require('./Blockchain');
const { buildAuditData } = require('./auditLog');
const { verifyMerkleProof } = require('./merkle');

const bas = Object.freeze({
  userId: 1,
  patientId: 7,
  role: 'DOCTOR',
  action: 'READ_JOURNAL',
  timestamp: '2026-10-01T12:00:00.000Z',
});

function kort(hash) {
  return `${hash.slice(0, 12)}...`;
}

function nyKedja(patientId) {
  const blockchain = new Blockchain();

  blockchain.addBlock(buildAuditData({ ...bas, patientId }));
  blockchain.addBlock(buildAuditData({
    ...bas,
    patientId,
    role: 'NURSE',
    action: 'CREATE_JOURNAL_ENTRY',
  }));

  return blockchain;
}

function rubrik(text) {
  console.log(`\n${text}`);
}

const signerad = nyKedja(7);
const block = signerad.chain[1];

rubrik('1. Signering');
console.log(`   Block 1 är signerat och kedjan är giltig: ${signerad.isChainValid()}`);

block.data.patientId = 8;
block.hash = block.calculateHash();

console.log('   Block 1 ändras till patient 8 och hashen räknas om.');
console.log(`   Hashen stämmer med innehållet: ${block.hasValidHash()}`);
console.log(`   Signaturen stämmer: ${block.hasValidSignature()}`);
console.log(`   Kedjan giltig: ${signerad.isChainValid()}`);

const merkle = nyKedja(7);
const root = merkle.getMerkleRoot();
const bevis = merkle.getMerkleProof(1);
const blockHash = merkle.chain[1].hash;

rubrik('2. Merkle Tree');
console.log(`   Rot: ${kort(root)}`);
console.log(`   Bevis för block 1 stämmer: ${verifyMerkleProof({ blockHash, proof: bevis, root })}`);

merkle.chain[2].data.action = 'DELETE_JOURNAL_ENTRY';
merkle.chain[2].hash = merkle.chain[2].calculateHash();

const nyRot = merkle.getMerkleRoot();

console.log('   Block 2 ändras och hashen räknas om.');
console.log(`   Ny rot: ${kort(nyRot)}`);
console.log(`   Samma bevis mot den nya roten: ${verifyMerkleProof({ blockHash, proof: bevis, root: nyRot })}`);

const patient7 = nyKedja(7);
const patient8 = nyKedja(8);
const [lägre, högre] = patient7.getLatestBlock().hash < patient8.getLatestBlock().hash
  ? [patient7, patient8]
  : [patient8, patient7];
const vinnande = lägre.getLatestBlock().hash;

rubrik('3. Fork med samma längd');
console.log(`   Patient 7, sista hash: ${kort(patient7.getLatestBlock().hash)}`);
console.log(`   Patient 8, sista hash: ${kort(patient8.getLatestBlock().hash)}`);
console.log(`   Lägst hash vinner: ${kort(vinnande)}`);
console.log(`   Den andra kedjan byts ut: ${högre.replaceChain(JSON.parse(JSON.stringify(lägre.chain)))}`);
console.log(`   Vinnaren behåller sin kedja: ${lägre.replaceChain(JSON.parse(JSON.stringify(högre.chain))) === false}`);
console.log(`   Båda har nu sista hash: ${kort(lägre.getLatestBlock().hash)} och ${kort(högre.getLatestBlock().hash)}`);
