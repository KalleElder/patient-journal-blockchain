const { generateKeyPair, publicKeyFromPrivate, ärNyckelsträng } = require('./signing');

// En signatur i sig bevisar ingenting. Den som ändrar ett block kan signera om
// det med sin egen nyckel och skicka med sin egen publika nyckel, och då
// stämmer signaturen mot blocket. Skyddet ligger i att noden vet vilka publika
// nycklar som hör till gruppens noder. Ett block räknas därför som signerat
// först när signaturen kommer från en nyckel vi känner igen.
//
// Nyckelringen ligger i modulen och inte i Blockchain, eftersom varje
// validering måste använda samma uppsättning nycklar. Skickades nycklarna in
// som argument skulle en anropare som glömde dem tysta signaturkontrollen, och
// den sortens misstag syns inte i en testkörning.
let nyckelring = null;

// Delar upp BLOCKCHAIN_TRUSTED_KEYS. Tomma poster hoppas över, så att ett
// avslutande kommatecken i .env inte blir en tom betrodd nyckel.
function delaNycklar(värde) {
  if (typeof värde !== 'string') {
    return [];
  }

  return värde.split(',').map((del) => del.trim()).filter((del) => del.length > 0);
}

// Används när ingen nyckel är konfigurerad. Noden kan då signera sina egna
// block och validera sin egen kedja, men känner inte igen någon annan nods
// nyckel. Paret försvinner vid omstart.
function skapaTillfälligNyckelring() {
  const { privateKey, publicKey } = generateKeyPair();

  return {
    privateKey,
    publicKey,
    betrodda: new Set([publicKey]),
    tillfällig: true,
  };
}

function configure({ privateKey, trustedKeys = [] }) {
  // Kastar om nyckeln inte går att läsa. Vår egen konfiguration ska stoppa
  // starten, inte tystna, eftersom en nod utan användbar nyckel skriver block
  // som ingen kan verifiera.
  const publicKey = publicKeyFromPrivate(privateKey);

  const ogiltiga = trustedKeys.filter((nyckel) => !ärNyckelsträng(nyckel));
  if (ogiltiga.length > 0) {
    throw new Error(`BLOCKCHAIN_TRUSTED_KEYS innehåller ${ogiltiga.length} ogiltig(a) nyckel/nycklar`);
  }

  // Den egna nyckeln är alltid betrodd hos sig själv. Annars skulle noden inte
  // kunna validera sin egen kedja.
  nyckelring = {
    privateKey,
    publicKey,
    betrodda: new Set([publicKey, ...trustedKeys]),
    tillfällig: false,
  };

  return nyckelring;
}

function configureFromEnv(env = process.env, log = console.log) {
  if (!env.BLOCKCHAIN_PRIVATE_KEY) {
    nyckelring = skapaTillfälligNyckelring();
    log(
      'BLOCKCHAIN_PRIVATE_KEY saknas. Noden signerar med ett tillfälligt '
      + 'nyckelpar och kommer att avvisa block från andra noder. '
      + 'Skapa en nyckel med: npm run keys:generate',
    );

    return nyckelring;
  }

  return configure({
    privateKey: env.BLOCKCHAIN_PRIVATE_KEY,
    trustedKeys: delaNycklar(env.BLOCKCHAIN_TRUSTED_KEYS),
  });
}

function getKeyring() {
  if (!nyckelring) {
    nyckelring = skapaTillfälligNyckelring();
  }

  return nyckelring;
}

function getSigningKey() {
  const ring = getKeyring();

  return { privateKey: ring.privateKey, publicKey: ring.publicKey };
}

// Sant endast för nycklar noden är konfigurerad att lita på.
function isTrusted(publicKey) {
  return ärNyckelsträng(publicKey) && getKeyring().betrodda.has(publicKey);
}

// Endast för tester, så att en testfil kan börja från ett känt läge.
function resetKeyring() {
  nyckelring = null;
}

module.exports = {
  configure,
  configureFromEnv,
  getSigningKey,
  isTrusted,
  resetKeyring,
  delaNycklar,
};
