const { createHash } = require('node:crypto');

// JSON.stringify skriver ut nycklarna i den ordning de råkar ligga i objektet.
// { userId: 1, role: 'DOCTOR' } och { role: 'DOCTOR', userId: 1 } beskriver samma
// händelse men skulle ge olika hash. När två noder ska jämföra kedjor måste samma
// innehåll alltid ge samma hash, därför sorteras nycklarna före hashningen.
function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const parts = Object.keys(value)
    .sort()
    .filter((key) => value[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);

  return `{${parts.join(',')}}`;
}

function sha256(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

module.exports = { sha256, stableStringify };
