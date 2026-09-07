const { sha256 } = require('./hash');

// Ett block i kedjan. Blockets timestamp är när blocket skapades, medan
// data.timestamp är när själva åtkomsten skedde i backend.
class Block {
  constructor({ index, timestamp, data, previousHash }) {
    this.index = index;
    this.timestamp = timestamp;
    // Kopieras så att kedjan inte delar objekt med den som skapade blocket.
    // Annars skulle backend kunna ändra sitt audit-event efteråt och därmed
    // ändra innehållet i ett redan skrivet block.
    this.data = structuredClone(data);
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return sha256({
      index: this.index,
      timestamp: this.timestamp,
      data: this.data,
      previousHash: this.previousHash,
    });
  }

  // Sant om den sparade hashen fortfarande stämmer med blockets innehåll.
  // Ändras data i efterhand räknas en annan hash fram och detta blir falskt.
  hasValidHash() {
    return this.hash === this.calculateHash();
  }
}

module.exports = Block;
