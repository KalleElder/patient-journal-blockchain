const { generateKeyPair } = require('./signing');

// Litet verktyg som skapar ett nyckelpar att klistra in i .env. Nycklarna
// skrivs bara ut och sparas inte någonstans, så inget hamnar av misstag i ett
// spårat filträd.
const { privateKey, publicKey } = generateKeyPair();

console.log('Nytt nyckelpar för signering av audit-block.');
console.log('');
console.log('Lägg de två raderna i projektets .env:');
console.log('');
console.log(`BLOCKCHAIN_PRIVATE_KEY=${privateKey}`);
console.log(`BLOCKCHAIN_TRUSTED_KEYS=${publicKey}`);
console.log('');
console.log('Den privata nyckeln får aldrig committas eller delas.');
console.log('Din publika nyckel är den andra raden. Ska flera noder synka med');
console.log('varandra listar varje nod allas publika nycklar i');
console.log('BLOCKCHAIN_TRUSTED_KEYS, separerade med komma. Kör du båda noderna');
console.log('lokalt från samma .env räcker det här paret.');
