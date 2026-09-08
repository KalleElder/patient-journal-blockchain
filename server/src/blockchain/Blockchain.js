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
}

module.exports = Blockchain;
