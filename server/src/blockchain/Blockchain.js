const Block = require('./Block');

// Genesis-blocket måste bli identiskt på varje nod, annars får noderna olika
// hashar redan från start och kan aldrig jämföra sina kedjor. Därför är både
// tidpunkten och innehållet fasta värden i stället för Date.now().
const GENESIS_TIMESTAMP = '2026-09-01T00:00:00.000Z';
const GENESIS_DATA = { action: 'GENESIS' };

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
    if (!Array.isArray(plainChain) || plainChain.length === 0) {
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

    for (let i = 1; i < this.chain.length; i += 1) {
      const block = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (!block.hasValidHash()) {
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
  replaceChain(receivedChain) {
    const candidate = Blockchain.fromJSON(receivedChain);

    if (!candidate) {
      return false;
    }

    if (candidate.chain.length <= this.chain.length) {
      return false;
    }

    // Valideras som en hel kedja, vilket också kontrollerar att den andra
    // noden utgår från samma genesis-block som vi.
    if (!candidate.isChainValid()) {
      return false;
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

    if (!block.hasValidHash()) {
      return false;
    }

    this.chain.push(block);
    return true;
  }
}

module.exports = Blockchain;
