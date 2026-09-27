const Block = require('./Block');

// Genesis-blocket måste bli identiskt på varje nod, annars får noderna olika
// hashar redan från start och kan aldrig jämföra sina kedjor. Därför är både
// tidpunkten och innehållet fasta värden i stället för Date.now().
const GENESIS_TIMESTAMP = '2026-09-01T00:00:00.000Z';
const GENESIS_DATA = { action: 'GENESIS' };

// Tak på hur lång en inkommande kedja får vara. Varje block i en kedja som tas
// emot kostar en hashomräkning och en signaturverifiering, och det arbetet är
// synkront. Utan tak kan vem som helst som får ansluta skicka en enorm kedja och
// låsa nodens event loop medan den räknar. Taket är långt över allt vi kommer i
// närheten av, men bundet.
//
// Det är en begränsning av skadan, inte en lösning. Den riktiga lösningen är att
// autentisera vilka noder som får ansluta, se server/src/p2p/README.md.
const MAX_KEDJELÄNGD = 10000;

class Blockchain {
  constructor() {
    this.chain = [Blockchain.createGenesisBlock()];
  }

  static createGenesisBlock() {
    return new Block({
      index: 0,
      timestamp: GENESIS_TIMESTAMP,
      data: GENESIS_DATA,
      previousHash: '0',
    });
  }

  // Bygger en kedja av vanliga objekt, till exempel en kedja som kommit in via
  // Socket.io. Returnerar null om något block inte går att återskapa, så att
  // skräpdata stoppas här i stället för att krascha valideringen längre fram.
  static fromJSON(plainChain) {
    if (!Array.isArray(plainChain)
      || plainChain.length === 0
      || plainChain.length > MAX_KEDJELÄNGD) {
      return null;
    }

    const blocks = [];

    for (const plain of plainChain) {
      const block = Block.fromJSON(plain);

      if (!block) {
        return null;
      }

      blocks.push(block);
    }

    const blockchain = new Blockchain();
    blockchain.chain = blocks;
    return blockchain;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  // Lägger till ett nytt block sist i kedjan och länkar det till föregående block.
  addBlock(data) {
    const previousBlock = this.getLatestBlock();
    const block = new Block({
      index: previousBlock.index + 1,
      timestamp: new Date().toISOString(),
      data,
      previousHash: previousBlock.hash,
    });

    block.sign();
    this.chain.push(block);
    return block;
  }

  // Går igenom hela kedjan och kontrollerar att ingenting har ändrats i efterhand.
  isChainValid() {
    if (!Array.isArray(this.chain) || this.chain.length === 0) {
      return false;
    }

    const genesis = this.chain[0];

    // Genesis behöver två kontroller. hasValidHash() fångar den som ändrar
    // innehållet men låter den gamla hashen ligga kvar. Jämförelsen mot ett
    // nytt genesis-block fångar den som byter ut hela blocket och räknar om
    // hashen. Ingen av kontrollerna räcker ensam.
    if (!genesis.hasValidHash() || genesis.hash !== Blockchain.createGenesisBlock().hash) {
      return false;
    }

    // Genesis byggs av koden på varje nod och har ingen som skapat det. Kravet
    // att det är osignerat gör att ingen kan hänga på en egen signatur där och
    // få den att se granskad ut. Alla andra block måste tvärtom vara signerade,
    // vilket kontrolleras i loopen nedan.
    if (genesis.signature !== null || genesis.publicKey !== null) {
      return false;
    }

    for (let i = 1; i < this.chain.length; i += 1) {
      const block = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (!block.hasValidHash()) {
        return false;
      }

      // Signaturen är det enda som skyddar kedjans sista block, eftersom det
      // inte har någon efterföljare vars previousHash kan avslöja en ändring.
      if (!block.hasValidSignature()) {
        return false;
      }

      if (block.previousHash !== previousBlock.hash) {
        return false;
      }

      if (block.index !== previousBlock.index + 1) {
        return false;
      }
    }

    return true;
  }

  // Tar emot en kedja från en annan nod. Den lokala kedjan byts bara ut om den
  // inkommande är både längre och giltig. Är den kortare, lika lång, trasig
  // eller manipulerad behåller noden sin egen kedja.
  //
  // Att två noder har olika kedjor med exakt samma längd hanteras inte här.
  // Då vinner den lokala kedjan tills vi bygger riktig fork-hantering.
  // onReject är valfri och får skälet till avslaget, så att den som anropar kan
  // logga något begripligt. Skälet lämnas här i stället för att räknas ut i
  // efterhand, eftersom en granne då hade kunnat få oss att validera samma kedja
  // flera gånger genom att skicka kedjor som alltid nekas.
  replaceChain(receivedChain, { onReject } = {}) {
    const avslå = (orsak) => {
      if (onReject) {
        onReject(orsak);
      }

      return false;
    };

    const candidate = Blockchain.fromJSON(receivedChain);

    if (!candidate) {
      return avslå('gick inte att läsa som en kedja');
    }

    if (candidate.chain.length <= this.chain.length) {
      return avslå('inte längre än vår egen');
    }

    // Valideras som en hel kedja, vilket också kontrollerar att den andra
    // noden utgår från samma genesis-block som vi och att varje block är
    // signerat av en nyckel vi litar på.
    if (!candidate.isChainValid()) {
      // En kedja som avvisas för att vi inte litar på nyckeln ser annars
      // identisk ut med en manipulerad kedja, och då är en felstavad
      // BLOCKCHAIN_TRUSTED_KEYS omöjlig att felsöka.
      const okändNyckel = candidate.chain
        .slice(1)
        .some((block) => !block.hasValidSignature());

      return avslå(okändNyckel
        ? 'signerad av en nyckel vi inte litar på, se BLOCKCHAIN_TRUSTED_KEYS'
        : 'ogiltig kedja');
    }

    this.chain = candidate.chain;
    return true;
  }

  // Lägger till ett enskilt block som en annan nod just har skapat. Blocket
  // får bara läggas till om det passar direkt ovanpå vårt sista block.
  // Gör det inte det ligger noderna isär och mottagaren behöver hela kedjan.
  addReceivedBlock(plainBlock) {
    const block = Block.fromJSON(plainBlock);

    if (!block) {
      return false;
    }

    const latest = this.getLatestBlock();

    if (block.index !== latest.index + 1 || block.previousHash !== latest.hash) {
      return false;
    }

    if (!block.hasValidHash() || !block.hasValidSignature()) {
      return false;
    }

    this.chain.push(block);
    return true;
  }
}

module.exports = Blockchain;
