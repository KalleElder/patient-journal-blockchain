const {
  generateKeyPairSync, sign, verify, createPrivateKey, createPublicKey,
} = require('node:crypto');

// Ed25519 valdes framför RSA eftersom det inte har några parametrar att välja
// fel på. Med RSA är nyckellängd och padding egna beslut, och ett dåligt val
// där ger en signatur som ser riktig ut men inte skyddar något. Nycklarna är
// dessutom korta nog att bäras som en rad i .env.
const NYCKELTYP = 'ed25519';

// En base64-kodad Ed25519-signatur är 88 tecken och en publik nyckel 60. Taket
// finns för att en granne inte ska kunna skicka en flera megabyte lång sträng
// och få oss att lägga tid och minne på att avkoda den.
const MAX_NYCKELLÄNGD = 200;

// Signaturen görs över det här prefixet plus hashen, inte över hashen ensam.
// Utan prefixet säger signaturen bara "jag har signerat den här 64 tecken långa
// hex-strängen", utan att säga till vad. Skulle samma nyckel någon gång användas
// till något annat som också signerar en hash, skulle en signatur kunna flyttas
// mellan de två sammanhangen. Prefixet knyter signaturen till att vara just ett
// audit-block i det här projektet.
const SIGNATURDOMÄN = 'patient-journal-audit-v1:';

function signeringsunderlag(hash) {
  return Buffer.from(SIGNATURDOMÄN + hash, 'utf8');
}

function ärNyckelsträng(värde) {
  return typeof värde === 'string' && värde.length > 0 && värde.length <= MAX_NYCKELLÄNGD;
}

// Skapar ett nytt nyckelpar. Nycklarna returneras som base64 så att de går att
// spara i en miljövariabel. Den privata nyckeln ska aldrig committas.
function generateKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync(NYCKELTYP);

  return {
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
  };
}

// Räknar fram den publika nyckeln ur den privata. Gör att bara den privata
// nyckeln behöver konfigureras, och tar bort risken att någon råkar lägga in
// två nycklar som inte hör ihop. Kastar om nyckeln inte går att läsa, vilket
// är rätt beteende för vår egen konfiguration: hellre stopp vid start än en
// nod som skriver block ingen kan verifiera.
function publicKeyFromPrivate(privateKeyBase64) {
  if (!ärNyckelsträng(privateKeyBase64)) {
    throw new Error('Privat nyckel måste vara en base64-sträng');
  }

  const key = createPrivateKey({
    key: Buffer.from(privateKeyBase64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });

  return createPublicKey(key).export({ type: 'spki', format: 'der' }).toString('base64');
}

// Signerar blockets hash. Hashen täcker index, timestamp, data och
// previousHash, så en signatur över hashen binder hela blockets innehåll.
// Signaturen ingår däremot inte i hashen, för då skulle hashen behöva vara
// färdig innan den kunde beräknas.
function signHash(hash, privateKeyBase64) {
  const key = createPrivateKey({
    key: Buffer.from(privateKeyBase64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });

  return sign(null, signeringsunderlag(hash), key).toString('base64');
}

// Sant endast om signaturen är gjord över exakt den här hashen med den privata
// nyckel som hör till den publika.
//
// Returnerar false i stället för att kasta. Allt som kommer hit kan ha
// passerat nätverket, och en trasig nyckel eller signatur från en granne ska
// avvisas, inte ta ner noden.
function verifyHash(hash, signatureBase64, publicKeyBase64) {
  if (typeof hash !== 'string' || !ärNyckelsträng(signatureBase64)
    || !ärNyckelsträng(publicKeyBase64)) {
    return false;
  }

  try {
    const key = createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });

    return verify(
      null,
      signeringsunderlag(hash),
      key,
      Buffer.from(signatureBase64, 'base64'),
    );
  } catch {
    return false;
  }
}

module.exports = {
  generateKeyPair,
  publicKeyFromPrivate,
  signHash,
  verifyHash,
  ärNyckelsträng,
  MAX_NYCKELLÄNGD,
  SIGNATURDOMÄN,
};
