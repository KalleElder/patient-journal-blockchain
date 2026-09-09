const { Server } = require('socket.io');
const { io: connectToPeer } = require('socket.io-client');

const Blockchain = require('../blockchain/Blockchain');
const { isAuditData } = require('../blockchain/auditLog');

// Tre händelser räcker för den här delen:
//   REQUEST_CHAIN  "skicka din kedja till mig"
//   CHAIN          "här är hela min kedja"
//   NEW_BLOCK      "jag har just skapat det här blocket"
const EVENTS = {
  REQUEST_CHAIN: 'REQUEST_CHAIN',
  CHAIN: 'CHAIN',
  NEW_BLOCK: 'NEW_BLOCK',
};

// Startar nodens P2P-del ovanpå en HTTP-server som redan finns. Noden är både
// server och klient: den tar emot anslutningar från andra noder och ansluter
// själv till dem som anges i peerUrls.
//
// P2P-lagret känner inte till hur block eller hashar fungerar. Det skickar och
// tar emot, och låter Blockchain avgöra vad som får accepteras.
// En kedja kan vara korrekt hashad och ändå innehålla sådant som aldrig får
// lagras. Att blocken hänger ihop säger bara att ingen ändrat i dem i
// efterhand, inte att grannen har följt reglerna när den skapade dem. Därför
// kontrolleras innehållet i varje block som kommer in över nätet.
//
// Genesis hoppas över eftersom det har sin egen data och redan jämförs mot
// vårt eget genesis-block i isChainValid().
function endastAuditData(plainChain) {
  return plainChain.every((block, index) => index === 0 || isAuditData(block && block.data));
}

function createP2PNode({
  httpServer,
  blockchain,
  name,
  peerUrls = [],
  log = console.log,
}) {
  const skriv = (meddelande) => log(`[NODE ${name}] ${meddelande}`);
  const io = new Server(httpServer, { cors: { origin: '*' } });
  const peerSockets = [];

  function skickaKedja(socket) {
    socket.emit(EVENTS.CHAIN, blockchain.chain);
  }

  function taEmotKedja(mottagen) {
    const antal = Array.isArray(mottagen) ? mottagen.length : 0;
    skriv(`Received chain (${antal} block)`);

    // Vanligast av allt: noderna är redan i takt. Det är inget avslag och ska
    // inte se ut som ett fel i loggen.
    if (antal === blockchain.chain.length
      && mottagen[antal - 1]
      && mottagen[antal - 1].hash === blockchain.getLatestBlock().hash) {
      skriv('Chain in sync');
      return;
    }

    if (Array.isArray(mottagen) && !endastAuditData(mottagen)) {
      skriv('Chain rejected (innehåller annat än audit-data)');
      return;
    }

    if (blockchain.replaceChain(mottagen)) {
      skriv('Chain valid');
      skriv(`Chain replaced (${blockchain.chain.length} block)`);
      return;
    }

    // Kedjan förkastades. Vi tar reda på varför enbart för loggens skull, så
    // att det syns om det handlar om en manipulerad kedja eller bara en
    // kortare. Beslutet är redan fattat av replaceChain.
    const kandidat = Blockchain.fromJSON(mottagen);
    const orsak = kandidat && kandidat.isChainValid()
      ? 'inte längre än vår egen'
      : 'ogiltig kedja';

    skriv(`Chain rejected (${orsak}), behåller lokal kedja med ${blockchain.chain.length} block`);
  }

  function taEmotBlock(plainBlock, socket) {
    // Noderna har en koppling åt vardera hållet, så samma block kommer fram
    // två gånger. Det andra exemplaret ignoreras tyst.
    if (plainBlock && plainBlock.hash === blockchain.getLatestBlock().hash) {
      return;
    }

    skriv('Received block');

    if (!isAuditData(plainBlock && plainBlock.data)) {
      skriv('Block rejected (innehåller annat än audit-data)');
      return;
    }

    if (blockchain.addReceivedBlock(plainBlock)) {
      skriv(`Block added (kedjan har ${blockchain.chain.length} block)`);
      return;
    }

    // Blocket passade inte sist i vår kedja, alltså ligger noderna isär.
    // Då hämtar vi hela kedjan i stället för att gissa oss fram.
    skriv('Block rejected, begär hela kedjan');
    socket.emit(EVENTS.REQUEST_CHAIN);
  }

  // Samma händelser gäller oavsett om vi är den som anslöt eller den som blev
  // ansluten till, så båda hållen registrerar dem på samma sätt.
  function kopplaHändelser(socket, etikett) {
    socket.on(EVENTS.REQUEST_CHAIN, () => {
      skriv(`Chain requested by ${etikett}`);
      skickaKedja(socket);
    });

    socket.on(EVENTS.CHAIN, taEmotKedja);
    socket.on(EVENTS.NEW_BLOCK, (block) => taEmotBlock(block, socket));
  }

  io.on('connection', (socket) => {
    skriv('Peer connected');
    kopplaHändelser(socket, 'peer');
    // Båda hållen frågar efter varandras kedjor när kopplingen upprättas, så
    // att noderna hamnar i takt oavsett vem som startade och vem som anslöt.
    socket.emit(EVENTS.REQUEST_CHAIN);
  });

  for (const url of peerUrls) {
    const socket = connectToPeer(url, { transports: ['websocket'] });
    let harLoggatFel = false;

    kopplaHändelser(socket, url);

    socket.on('connect', () => {
      harLoggatFel = false;
      skriv(`Connected to ${url}`);
      // Be om grannens kedja direkt, så att en nod som startar senare hinner
      // ikapp i stället för att stå kvar med bara sitt genesis-block.
      socket.emit(EVENTS.REQUEST_CHAIN);
    });

    // Socket.io försöker återansluta av sig självt. Vi loggar bara första
    // gången så att en granne som inte startat än inte fyller terminalen.
    socket.on('connect_error', () => {
      if (!harLoggatFel) {
        skriv(`Kan inte nå ${url} ännu, försöker igen`);
        harLoggatFel = true;
      }
    });

    peerSockets.push(socket);
  }

  // Skickas till både de noder som anslutit till oss och de vi anslutit till.
  function broadcastBlock(block) {
    skriv(`Broadcasting block ${block.index}`);
    io.emit(EVENTS.NEW_BLOCK, block);

    for (const socket of peerSockets) {
      socket.emit(EVENTS.NEW_BLOCK, block);
    }
  }

  function close() {
    for (const socket of peerSockets) {
      socket.disconnect();
    }

    // Stänger även HTTP-servern som Socket.io ligger på.
    return io.close();
  }

  return { io, broadcastBlock, close, skriv };
}

module.exports = { createP2PNode, EVENTS };
