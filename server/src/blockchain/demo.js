// Demonstration av blockkedjan. Körs med:
//   node src/blockchain/demo.js
//
// Scriptet bygger en kedja av access logs, visar att den är giltig, och
// försöker sedan dölja en åtkomst genom att ändra i ett gammalt block.

const Blockchain = require('./Blockchain');
const { buildAuditData } = require('./auditLog');

function visaKedjan(blockchain) {
  for (const block of blockchain.chain) {
    console.log(`Block ${block.index}`);
    console.log(`  data:         ${JSON.stringify(block.data)}`);
    console.log(`  previousHash: ${block.previousHash.slice(0, 16)}...`);
    console.log(`  hash:         ${block.hash.slice(0, 16)}...`);
  }
}

const blockchain = new Blockchain();

console.log('1. Ny blockkedja med genesis block');
console.log(`   Antal block: ${blockchain.chain.length}\n`);

console.log('2. Läkare läser patient 7:s journal');
blockchain.addBlock(buildAuditData({
  userId: 1,
  patientId: 7,
  role: 'DOCTOR',
  action: 'READ_JOURNAL',
  timestamp: new Date().toISOString(),
}));

console.log('3. Sjuksköterska skriver en anteckning på patient 7');
blockchain.addBlock(buildAuditData({
  userId: 2,
  patientId: 7,
  role: 'NURSE',
  action: 'CREATE_JOURNAL_ENTRY',
  timestamp: new Date().toISOString(),
}));

console.log('4. Patienten läser sin egen journal\n');
blockchain.addBlock(buildAuditData({
  userId: 4,
  patientId: 7,
  role: 'PATIENT',
  action: 'READ_JOURNAL',
  timestamp: new Date().toISOString(),
}));

visaKedjan(blockchain);
console.log(`\n   Kedjan giltig: ${blockchain.isChainValid()}\n`);

console.log('5. Journaltext försöker läggas in i kedjan');
try {
  blockchain.addBlock(buildAuditData({
    userId: 1,
    patientId: 7,
    role: 'DOCTOR',
    action: 'CREATE_JOURNAL_ENTRY',
    timestamp: new Date().toISOString(),
    content: 'Patienten har diabetes typ 2',
  }));
} catch (error) {
  console.log(`   Avvisat: ${error.message}\n`);
}

console.log('6. Någon försöker dölja att patient 7 lästes, genom att');
console.log('   ändra block 1 till att gälla patient 8');
blockchain.chain[1].data.patientId = 8;
console.log(`\n   Kedjan giltig: ${blockchain.isChainValid()}`);
console.log('   Ändringen upptäcks eftersom blockets sparade hash inte längre');
console.log('   stämmer med innehållet.');
