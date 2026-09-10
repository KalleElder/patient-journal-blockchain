const { sha256 } = require('./hash');

// Ett blocks data är alltid platt: några fält med primitiva värden. Genom att
// kräva det redan innan blocket byggs stoppas bland annat djupt kapslade
// objekt, som annars får structuredClone och hashningen att gå igenom hela
// anropsstacken och krascha noden. En granne ska kunna skicka vad som helst
// utan att vi faller omkull.
function ärPlattData(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  return Object.values(data).every((värde) => värde === null || typeof värde !== 'object');
}

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

  // Återskapar ett block ur vanlig JSON, till exempel en kedja som kommit in
  // över nätverket. Där är blocken bara objekt och saknar hasValidHash().
  // Den medskickade hashen behålls i stället för att räknas om, annars skulle
  // ett manipulerat block få en ny och giltig hash på vägen in.
  // Returnerar null om objektet inte ser ut som ett block.
  static fromJSON(plain) {
    if (plain === null || typeof plain !== 'object' || Array.isArray(plain)) {
      return null;
    }

    const harBlockformat = Number.isInteger(plain.index)
      && typeof plain.timestamp === 'string'
      && typeof plain.previousHash === 'string'
      && typeof plain.hash === 'string';

    if (!harBlockformat || !ärPlattData(plain.data)) {
      return null;
    }

    // Sista skyddsnätet. Data utifrån ska alltid ge null, aldrig ett kast som
    // tar ner noden, oavsett vad grannen hittar på.
    try {
      const block = new Block({
        index: plain.index,
        timestamp: plain.timestamp,
        data: plain.data,
        previousHash: plain.previousHash,
      });

      block.hash = plain.hash;
      return block;
    } catch {
      return null;
    }
  }
}

module.exports = Block;
