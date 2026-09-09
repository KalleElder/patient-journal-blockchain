# P2P

Synkronisering av blockkedjan mellan noder i Patient Journal Blockchain.

Huvudansvarig: Tim.

## Vad delen gör

Varje nod kör en egen kopia av blockkedjan. P2P-lagret ser till att noderna
kommer överens om vilken kedja som gäller, så att en access log som skapas på
en nod syns på den andra.

Uppdelningen följer den vi kom överens om i gruppen:

| Modul | Ansvar |
| --- | --- |
| `blockchain/Blockchain.js` | Avgör om en kedja är giltig och får ersätta den lokala |
| `blockchain/auditLog.js` | Avgör vad som får ligga i ett block |
| `p2p/p2pServer.js` | Skickar och tar emot mellan noder |

P2P-lagret fattar alltså inga beslut om innehåll. Det tar emot, frågar
blockkedjan om det duger, och loggar svaret.

## Filer

| Fil | Ansvar |
| --- | --- |
| `p2pServer.js` | Socket.io-server och klient, hanterar de tre händelserna |
| `devAuditRoutes.js` | Tillfälliga utvecklingsrutter, se längre ner |
| `demo.js` | Demonstration av synk och avslag |
| `p2p.test.js` | Automatiska tester över riktiga sockets |

## Starta två noder

Varje nod behöver en egen port och adressen till sin granne. Kör i varsin
terminal, från `server/`:

Terminal 1:

    PORT=3001 PEER_URL=http://localhost:3002 npm start

Terminal 2:

    PORT=3002 PEER_URL=http://localhost:3001 npm start

Noden startar även utan `PEER_URL` och kör då ensam. `PEER_URL` kan innehålla
flera adresser separerade med komma om vi senare vill köra fler än två noder.

Det gör inget att den ena noden startar först. Den loggar att grannen inte går
att nå och Socket.io fortsätter försöka i bakgrunden.

## Hur synken fungerar

Tre händelser räcker för den här delen:

| Händelse | Betydelse |
| --- | --- |
| `REQUEST_CHAIN` | "skicka din kedja till mig" |
| `CHAIN` | "här är hela min kedja" |
| `NEW_BLOCK` | "jag har just skapat det här blocket" |

Varje nod är både server och klient. Den tar emot anslutningar från andra noder
och ansluter själv till dem i `PEER_URL`. När kopplingen upprättas frågar båda
hållen efter varandras kedjor, så att noderna hamnar i takt oavsett vem som
startade först.

### När en hel kedja tas emot

Den lokala kedjan byts bara ut om den inkommande är **giltig och längre**.

1. Är kedjan identisk med vår egen händer ingenting, noderna är redan i takt.
2. Innehåller något block annat än audit-data avvisas kedjan.
3. Är kedjan kortare eller lika lång behåller noden sin egen.
4. Blocken återskapas som riktiga `Block`-objekt.
5. `isChainValid()` körs på hela kedjan.
6. Först då ersätts den lokala kedjan.

Två noder med olika kedjor av exakt samma längd är en fork. Där vinner den
lokala kedjan tills vi bygger riktig fork-hantering, annars skulle noderna
kunna skriva över varandra fram och tillbaka i all oändlighet.

### När ett enskilt block tas emot

Ett block läggs bara till om det passar direkt ovanpå nodens sista block.
Gör det inte det ligger noderna isär, och då begär noden hela kedjan i stället
för att gissa var blocket hör hemma.

## Blocken måste återskapas

När en kedja skickas över Socket.io går den genom JSON. På andra sidan är
blocken vanliga objekt, inte `Block`-instanser, och saknar alltså
`hasValidHash()`. Att bara göra `this.chain = receivedChain` ger därför en
kedja som ser rätt ut men inte går att validera.

Det löses av `Block.fromJSON()`, som bygger ett riktigt block av objektet.
Den **behåller den medskickade hashen** i stället för att räkna om den. Räknade
den om hashen skulle varje manipulerat block bli giltigt i samma sekund som det
togs emot, vilket gör hela valideringen meningslös. Det finns ett eget test för
just det.

`Block.fromJSON()` returnerar `null` på allt som inte ser ut som ett block, i
stället för att kasta. Bland annat krävs att blockets `data` är platt, alltså
några fält med primitiva värden. Ett block med djupt kapslad data skulle annars
ta `structuredClone` och hashningen genom hela anropsstacken och krascha noden,
vilket räcker för att slå ut en nod utifrån med ett enda meddelande.

## Ingen journaltext över nätet

`buildAuditData()` skyddar det vi själva skriver till kedjan, men säger
ingenting om vad en granne skickar. En kedja kan hasha helt korrekt och ändå
innehålla journaltext, eftersom hasharna bara bevisar att ingen ändrat i
blocken i efterhand, inte att den som skapade dem följde reglerna.

Därför kontrolleras innehållet i varje block som kommer in över nätet mot samma
regler som gäller lokalt. En kedja med `content: "Patienten har diabetes typ 2"`
avvisas även om den är längre och alla hashar stämmer. Genesis hoppas över,
eftersom det har sitt eget innehåll och redan jämförs mot vårt genesis-block.

## Loggar

Noderna loggar med sitt eget portnummer först, så att det går att följa vad som
händer när två terminaler kör samtidigt:

    [NODE 3001] Server started
    [NODE 3002] Connected to http://localhost:3001
    [NODE 3002] Received chain (3 block)
    [NODE 3002] Chain valid
    [NODE 3002] Chain replaced (3 block)

Avslag loggas med anledning, exempelvis:

    [NODE 3002] Chain rejected (ogiltig kedja), behåller lokal kedja med 4 block
    [NODE 3002] Chain rejected (innehåller annat än audit-data)
    [NODE 3002] Chain in sync

## Köra demon

Från `server/`:

    node src/p2p/demo.js

Demon startar två noder på 3001 och 3002 i samma process och går igenom hela
flödet: node 3002 hämtar kedjan vid anslutning, ett nytt audit-block skickas ut
och tas emot, och tre försök till avslag visas. En manipulerad kedja, en kedja
med journaltext som hashar korrekt, och en kortare kedja.

Portarna 3001 och 3002 måste vara lediga när demon körs.

## Köra testerna

Från `server/`:

    node --test

54 tester ska passera, varav tolv startar riktiga Socket.io-noder. Testerna
lyssnar på port 0 och låter operativsystemet välja port, så de krockar varken
med varandra eller med en server som körs samtidigt.

Testerna täcker att en längre giltig kedja accepteras, att en kortare, lika
lång, tom, manipulerad eller journaltext-bärande kedja nekas, att båda noderna
använder samma genesis, att ett nytt audit-block synkas mellan två noder, att
en nod som ligger efter hämtar hela kedjan, och att block som kommit över nätet
är riktiga `Block`-objekt.

## Tillfälliga utvecklingsrutter

`devAuditRoutes.js` lägger till två rutter:

    POST /api/dev/audit    skapar ett audit-block och skickar ut det
    GET  /api/dev/chain    visar nodens kedja

De är **avstängda som standard** och kräver `P2P_DEV_ROUTES=true`. De finns
bara för att backendens `auditLogger` inte är byggd än. Utan dem går det inte
att skapa ett audit-block i en körande server, och därmed inte heller att visa
broadcast mellan två terminaler.

    PORT=3001 PEER_URL=http://localhost:3002 P2P_DEV_ROUTES=true npm start

    curl -X POST http://localhost:3001/api/dev/audit \
      -H "Content-Type: application/json" \
      -d '{"userId":1,"patientId":7,"role":"DOCTOR","action":"READ_JOURNAL","timestamp":"2026-09-09T10:00:00.000Z"}'

    curl http://localhost:3002/api/dev/chain

Rutterna ska tas bort när `auditLogger` finns, eftersom de skriver till kedjan
utan inloggning.

## Implementerat

- `replaceChain()` med longest-chain-regeln
- `Block.fromJSON()` och `Blockchain.fromJSON()` för mottagna kedjor
- `addReceivedBlock()` för enskilda block
- Socket.io-server och klient i varje nod
- `REQUEST_CHAIN`, `CHAIN` och `NEW_BLOCK`
- Utbyte av kedjor när noderna ansluter, åt båda hållen
- Broadcast när noden själv skapar ett audit-block
- Kontroll av att endast audit-data kommer in över nätet
- Loggar per nod och demonstrationsscript

## Inte implementerat ännu

- Fork-hantering när två kedjor har exakt samma längd
- Digital signering och verifiering av vem som skapade ett block
- Merkle Tree
- Persistens; kedjan ligger i minnet och försvinner när noden stoppas
- Autentisering mellan noder, vem som helst kan i dag ansluta till en nod
- Inkoppling mot backendens `auditLogger`
