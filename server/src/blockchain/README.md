# Blockchain

Blockkedjan för access logs i Patient Journal Blockchain.

Huvudansvarig: Tim.

## Viktigaste regeln

Medicinsk journaldata lagras aldrig i blockkedjan.

Journaltext, diagnoser och behandlingar hör hemma i SQL-databasen. Blockkedjan
innehåller endast metadata om vem som gjorde vad, med vilken patient och när.

Regeln är inte bara en överenskommelse utan kontrolleras i koden. `buildAuditData()`
avvisar alla fält som inte ingår i det gemensamma audit-formatet, så ett anrop som
råkar skicka med `content` kastar ett fel i stället för att skriva journaltext till
kedjan.

Fältnamnen räcker dock inte. Journaltext skulle annars kunna gömmas i ett fält
som heter rätt, exempelvis `userId: 'Patienten har diabetes typ 2'`. Därför
kontrolleras även innehållet: `userId` och `patientId` måste vara heltal,
`action` måste vara en konstant i versaler som `READ_JOURNAL`, `timestamp` måste
vara en tidsstämpel som sträng, och `role` måste vara en av de fem rollerna.
Det finns inget fält kvar där fritext får plats.

Den som anropar `Blockchain.addBlock()` direkt går förbi kontrollen. Backend ska
därför alltid gå via `createAuditLog()`.

## Filer

| Fil | Ansvar |
| --- | --- |
| `Block.js` | Ett enskilt block och dess hash |
| `Blockchain.js` | Kedjan, genesis block, nya block och validering |
| `hash.js` | SHA-256 och deterministisk serialisering |
| `auditLog.js` | Kontroll av audit-format, skyddet mot journaltext |
| `index.js` | Modulens utsida, bland annat `createAuditLog()` |
| `demo.js` | Demonstrationsscript |
| `blockchain.test.js` | Automatiska tester |

## Block

Ett block innehåller:

    {
      index: 1,
      timestamp: "2026-09-07T12:00:00.000Z",
      data: {
        userId: 1,
        patientId: 7,
        role: "DOCTOR",
        action: "READ_JOURNAL",
        timestamp: "2026-09-07T11:59:58.000Z"
      },
      previousHash: "af70c924...",
      hash: "c70b7c6e..."
    }

Blockets `timestamp` är när blocket skapades. `data.timestamp` är när själva
åtkomsten skedde i backend. De två är alltså inte samma sak.

Blockets `data` kopieras när blocket skapas. Skulle backend ändra sitt eget
event-objekt efteråt påverkar det inte blocket som redan ligger i kedjan.

## Hur hashen beräknas

Hashen är SHA-256 över `index`, `timestamp`, `data` och `previousHash`, alltså
allt som utgör blockets innehåll.

Innan hashning serialiseras innehållet med sorterade nycklar. Vanlig
`JSON.stringify` skriver ut nycklarna i den ordning de råkar ligga i objektet,
vilket betyder att `{ userId: 1, role: "DOCTOR" }` och `{ role: "DOCTOR", userId: 1 }`
skulle få olika hash trots att de beskriver samma händelse. När två noder senare
ska jämföra sina kedjor måste samma innehåll alltid ge samma hash, därför sorteras
nycklarna i `hash.js`.

## Hur previousHash används

Varje nytt block sparar hashen från blocket före sig. Det är det som gör kedjan
till en kedja: ändras ett gammalt block får det en ny hash, och då stämmer inte
längre nästa blocks `previousHash`.

Genesis block har `previousHash: "0"` eftersom det inte finns något block före.

Genesis block är avsiktligt deterministiskt, med fast tidpunkt och fast innehåll
i stället för `Date.now()`. Två noder som startar var för sig får därför exakt
samma genesis block och kan jämföra sina kedjor när P2P byggs.

## Chain validation

`isChainValid()` går igenom kedjan och kontrollerar att:

- kedjan inte är tom
- genesis-blockets sparade hash stämmer med dess innehåll
- genesis-blocket är det kanoniska genesis-blocket
- varje blocks sparade hash stämmer med en omräkning av innehållet
- varje blocks `previousHash` matchar föregående blocks hash
- indexen följer på varandra

Ändrar någon data i ett gammalt block räcker det inte att räkna om just det
blockets hash, eftersom nästa block fortfarande pekar på den gamla hashen.

### Känd begränsning: kedjans sista block

Skyddet mot en omräknad hash kommer från nästa blocks `previousHash`. Sista
blocket har ingen efterföljare, och kan därför ändras med omräknad hash eller
tas bort helt utan att `isChainValid()` slår till.

Det är inte en bugg som går att koda bort inne i den här klassen. En hashkedja
kan inte förankra sitt eget slut på egen hand. Det löses av signering, som
knyter varje block till en nyckel, och av P2P-synkronisering, där en annan nod
har en längre kedja och avslöjar den som saknar block. Båda är kommande arbete.

Begränsningen har ett eget test, `KÄND BEGRÄNSNING: sista blocket är ännu inte
skyddat mot omräknad hash`, så att den syns i testkörningen och så att testet
faller när skyddet väl byggs.

Genesis behöver två kontroller, inte en. Den som ändrar innehållet men låter
den gamla hashen ligga kvar fångas av hash-omräkningen. Den som byter ut hela
blocket och räknar om hashen fångas av jämförelsen mot det kanoniska
genesis-blocket. Ingen av kontrollerna räcker ensam, eftersom genesis inte har
något föregående block som kan avslöja en ändring.

## Gränssnitt mot backend

Blockkedjan är medvetet fristående och känner inte till Express, routes eller
databasen. Tanken är att Yamfus `auditLogger` senare ska kunna göra:

    const { createAuditLog } = require('./blockchain');

    createAuditLog({
      userId: 1,
      patientId: 7,
      role: 'DOCTOR',
      action: 'READ_JOURNAL',
      timestamp: new Date().toISOString(),
    });

Funktionen validerar audit-datat och lägger till ett block. Den är ännu inte
inkopplad i någon route, det görs i AuditLogger-steget.

Rollen måste vara en av `DOCTOR`, `NURSE`, `CARE_CENTER`, `PATIENT` eller
`UNAUTHORIZED`.

## Köra testerna

Från `server/`:

    node --test

24 tester ska passera.

Kör inte `node --test src/blockchain/` med en katalog som argument. På Node 24
rapporterar den varianten "pass 1" och returnerar 0 även när ett test faktiskt
failar, alltså kan trasig kod se grön ut.

Testerna täcker bland annat att kedjan skapas med genesis block, att nya block
länkas med rätt `previousHash`, att en korrekt kedja är giltig, att manipulerad
data upptäcks, och att audit-data kan lagras utan journaltext.

## Köra demon

Från `server/`:

    node src/blockchain/demo.js

Demon bygger en kedja med tre access logs och visar hasharna. Sedan görs två
försök att få in journaltext, ett rakt via `content` och ett där texten göms i
`userId`, och båda avvisas. Till sist ändras ett gammalt block så att
valideringen slår till.

## Implementerat

- Block med index, timestamp, data, previousHash och hash
- SHA-256 med deterministisk serialisering
- Deterministiskt genesis block
- Nya block länkade via previousHash
- `isChainValid()`, inklusive kontroll av genesis-blockets innehåll
- Audit-format enligt `docs/api-contract.md`
- Skydd som avvisar okända fält, journaltext och fritext i tillåtna fält
- `createAuditLog()` som gränssnitt mot backend
- Automatiska tester och demonstrationsscript

## Inte implementerat ännu

Detta är kommande arbete och finns alltså inte i koden:

- P2P mellan node 3001 och 3002
- Socket.io
- Public/private key-signering
- Verifiering av digitala signaturer
- Merkle Tree
- Fork-hantering och longest-chain rule
- Inkoppling mot backendens AuditLogger
- Persistens; kedjan ligger i minnet och försvinner när servern stoppas
- Skydd av kedjans sista block, se den kända begränsningen ovan
