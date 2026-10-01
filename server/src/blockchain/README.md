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
Strängfälten har dessutom ett tak på 64 tecken, så ingen kan bära text i dem
genom att bara skriva den i versaler. Det finns inget fält kvar där fritext får
plats.

Formkontrollen av `action` byts mot en lista av tillåtna värden när
`docs/api-contract.md` och `docs/roles-and-permissions.md` är synkade. Kalle
har bett mig stämma av dem med Yamfu inför integrationen.

Den som anropar `Blockchain.addBlock()` direkt går förbi kontrollen. Backend ska
därför alltid gå via `createAuditLog()`.

## Filer

| Fil | Ansvar |
| --- | --- |
| `Block.js` | Ett enskilt block och dess hash |
| `Blockchain.js` | Kedjan, genesis block, nya block och validering |
| `hash.js` | SHA-256 och deterministisk serialisering |
| `merkle.js` | Merkle-rot över kedjan och bevis för ett enskilt block |
| `auditLog.js` | Kontroll av audit-format, skyddet mot journaltext |
| `signing.js` | Ed25519: nyckelpar, signera och verifiera |
| `keyring.js` | Nodens egen nyckel och vilka publika nycklar den litar på |
| `generateKeys.js` | Skriver ut ett nytt nyckelpar att lägga i `.env` |
| `index.js` | Modulens utsida, bland annat `createAuditLog()` |
| `demo.js` | Demonstration av kedja, giltighet och avvisad journaltext |
| `demoAvancerat.js` | Demonstration av signering, Merkle Tree och fork |
| `blockchain.test.js` | Automatiska tester |
| `sync.test.js` | Tester för synk mellan noder, utan nätverk |
| `signing.test.js` | Tester för signering och verifiering |
| `merkle.test.js` | Tester för Merkle-rot och bevis |

Själva nätverket ligger i `server/src/p2p/`, se `server/src/p2p/README.md`.

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
      hash: "c70b7c6e...",
      signature: "K1dQ8f...",
      publicKey: "MCowBQYDK2VwAyEA..."
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
- genesis-blocket är osignerat
- varje blocks sparade hash stämmer med en omräkning av innehållet
- varje blocks signatur är gjord över just den hashen, av en nyckel vi litar på
- varje blocks `previousHash` matchar föregående blocks hash
- indexen följer på varandra

Ändrar någon data i ett gammalt block räcker det inte att räkna om just det
blockets hash, eftersom nästa block fortfarande pekar på den gamla hashen.

Varje block utom genesis får alltså samma fyra kontroller: hash, signatur,
länk bakåt och index. Genesis får tre egna i stället, eftersom det inte har
något föregående block att jämföras mot: hash, kanonisk hash och att det är
osignerat.

### Kedjans sista block

Skyddet mot en omräknad hash kommer från nästa blocks `previousHash`. Sista
blocket har ingen efterföljare och var därför länge oskyddat: den som ändrade
innehållet och räknade om hashen gick rakt igenom valideringen. Det var en
dokumenterad begränsning ända fram till signeringen.

Signeringen stänger hålet. Signaturen är gjord över blockets hash, så en
omräknad hash täcks inte längre av den gamla signaturen, och för att signera om
blocket krävs en privat nyckel noden litar på. Båda varianterna av angreppet har
egna tester: ändrad data med kvarlämnad hash, och ändrad data med omräknad hash.

Kvar finns att ett **borttaget** sista block inte kan upptäckas av valideringen
ensam. En hashkedja kan inte se vad den inte längre har. Där är det P2P-synken
som räddar oss, eftersom noden då har en kortare kedja än grannen och får den
ersatt. Även det har ett eget test.

Genesis behöver två kontroller, inte en. Den som ändrar innehållet men låter
den gamla hashen ligga kvar fångas av hash-omräkningen. Den som byter ut hela
blocket och räknar om hashen fångas av jämförelsen mot det kanoniska
genesis-blocket. Ingen av kontrollerna räcker ensam, eftersom genesis inte har
något föregående block som kan avslöja en ändring.

## Signering

Varje audit-block signeras med nodens privata nyckel. Signaturen görs över
blockets hash, och eftersom hashen täcker index, timestamp, data och
previousHash binder signaturen hela blockets innehåll.

Signaturen ingår däremot inte i hashen. Gjorde den det skulle hashen behöva vara
färdig innan den kunde beräknas, och nästa blocks `previousHash` skulle peka på
en hash som ändrades i samma stund blocket signerades.

Algoritmen är Ed25519. Den valdes framför RSA eftersom den inte har några
parametrar att välja fel på, och för att nycklarna är korta nog att bäras som en
rad i `.env`.

Signaturen görs över en domänsträng plus hashen, inte över hashen ensam. En
signatur över bara en hash säger "jag har signerat den här hex-strängen" utan att
säga till vad. Skulle samma nyckel någon gång användas till något annat som också
signerar en hash, skulle en signatur kunna flyttas mellan de två sammanhangen.
Domänsträngen knyter signaturen till att vara just ett audit-block i det här
projektet. Det finns ett test som signerar över bara hashen och kontrollerar att
det inte godtas.

### Varför en signatur inte räcker

En signatur i sig bevisar ingenting. Den som ändrar ett block kan signera om det
med sin egen nyckel och skicka med sin egen publika nyckel, och då stämmer
signaturen mot blocket. Verifieringen hade sagt ja.

Skyddet ligger i att noden vet vilka publika nycklar som hör till gruppens
noder. Ett block räknas som signerat först när signaturen kommer från en nyckel
noden är konfigurerad att lita på. Det är den kontrollen som gör att en
angripare inte kan skriva om ett block, och tas den bort faller fem tester.

Nyckelringen ligger i `keyring.js` och inte som argument till `isChainValid()`.
Skickades nycklarna in som argument skulle en anropare som glömde dem tysta hela
signaturkontrollen, och den sortens misstag syns inte i en testkörning.

### Genesis är osignerat

Genesis byggs av koden på varje nod och har ingen som skapat det. Att kräva en
signatur där skulle göra genesis olika på varje nod, och då kan noderna aldrig
jämföra sina kedjor. Därför är genesis osignerat, och valideringen kräver
uttryckligen att det är osignerat, så att ingen kan hänga på en egen signatur
och få blocket att se granskat ut.

### Nycklar

Skapa ett nyckelpar:

    npm run keys:generate --prefix server

Kommandot skriver ut två rader att klistra in i projektets `.env`:

    BLOCKCHAIN_PRIVATE_KEY=...
    BLOCKCHAIN_TRUSTED_KEYS=...

Den privata nyckeln signerar nodens egna block och får aldrig committas eller
delas. `.env` är gitignorerad, och nycklarna sparas inte till någon fil av
scriptet.

`BLOCKCHAIN_TRUSTED_KEYS` är de publika nycklar noden accepterar block från,
separerade med komma. Nodens egen nyckel är alltid betrodd hos sig själv, annars
skulle noden inte kunna validera sin egen kedja.

Kör man båda noderna lokalt från samma `.env` delar de nyckel och synkar direkt.
Ska varje nod ha sin egen privata nyckel listar man allas publika nycklar i
`BLOCKCHAIN_TRUSTED_KEYS` hos varje nod.

Saknas `BLOCKCHAIN_PRIVATE_KEY` startar noden ändå, men med ett tillfälligt
nyckelpar som försvinner vid omstart. Den kan då validera sin egen kedja men
avvisar block från andra noder, och det loggas vid start.

## Synk mellan noder

`replaceChain(receivedChain)` tar emot en kedja från en annan nod och ersätter
den lokala bara om den inkommande är **giltig och antingen längre eller en fork
som vinner tiebreaken** nedan. Kedjan återskapas
först till riktiga `Block`-objekt med `Blockchain.fromJSON()`, eftersom en
kedja som kommit via JSON bara innehåller vanliga objekt utan metoder.

`Block.fromJSON()` behåller den medskickade hashen, signaturen och den publika
nyckeln i stället för att räkna om eller sätta dem på nytt. Räknades hashen om
skulle varje manipulerat block bli giltigt i samma stund som det togs emot, och
signerades blocket om på vägen in skulle vi själva intyga något vi inte vet.

`addReceivedBlock(plainBlock)` lägger till ett enskilt block från en annan nod,
men bara om det passar direkt ovanpå kedjans sista block.

`replaceChain()` tar en valfri `onReject`-funktion och lämnar skälet till ett
avslag där. Skälet räknas alltså ut medan kedjan redan gås igenom, inte i
efterhand. Räknades det ut efteråt skulle varje avvisad kedja valideras två gånger
i stället för en, och en granne som skickar kedjor som alltid nekas skulle få oss
att göra dubbelt arbete.

En inkommande kedja får dessutom vara högst 10 000 block lång. Varje block kostar
en hashomräkning och en signaturverifiering, och det arbetet är synkront. Utan tak
kan den som får ansluta skicka en enorm kedja och låsa nodens event loop. Taket
begränsar skadan men löser inte grundproblemet, som är att anslutningarna inte är
autentiserade.

## Fork-hantering

Två noder kan hamna med olika kedjor av exakt samma längd, till exempel om båda
skriver ett audit-block medan kopplingen mellan dem ligger nere. Då avgör hashen
på sista blocket, och den lägsta vinner.

Regeln räknas fram ur kedjorna själva och blir därför densamma på båda noderna,
så de landar på samma kedja i stället för att skriva över varandra fram och
tillbaka. Är hasharna lika är det redan samma kedja och ingenting byts ut.

Tiebreaken gäller bara vid exakt samma längd. En kortare kedja avvisas
fortfarande direkt, hur låg dess hash än är, annars skulle en granne kunna
skriva om vår historik med en kedja som är sämre än den vi redan har.

Jämförelsen görs på en hash som ännu inte är verifierad, så en granne kan hitta
på ett lågt värde för att vinna. Det ger ingenting, eftersom `isChainValid()`
körs efteråt och kräver att hashen stämmer med blockets innehåll och att
signaturen är gjord över just den hashen. En fork går alltså igenom exakt samma
kontroller som en längre kedja.

Förlorar vår gren försvinner de block vi själva hade lagt till efter
förgreningspunkten. De skrivs inte om någon annanstans, så ett audit-event som
bara fanns där är borta. Det är en känd begränsning av den här nivån av
fork-hantering, inte något koden döljer.

## Merkle Tree

Roten är en hash som sammanfattar alla block i kedjan, och den räknas fram ur
kedjan när den behövs:

    const root = getAuditChain().getMerkleRoot();
    const proof = getAuditChain().getMerkleProof(3);

    verifyMerkleProof({ blockHash: block.hash, proof, root });

Roten ligger medvetet utanför blocken. Läggs den in i det som hashas ändras
genesis-blockets hash, och därmed varje block i varje kedja, utan att kedjan blir
säkrare. Blockets form är alltså oförändrad och signeringen är orörd.

Nyttan ligger i beviset. Med roten och som mest ungefär `log2(n)` hashar går det
att visa att ett enskilt audit-event ligger i kedjan utan att lämna ut de andra
blocken, alltså utan att visa andra patienters metadata. Ett bevis innehåller
dock syskonens hashar och blockets plats i trädet, så den som redan känner till
ett annat blocks hash kan se att det ligger intill. Ingen metadata läcker, men
sambandet gör det, och därför ska bevis inte spridas fritare än blocken själva.

Två noder kan också jämföra en enda hash i stället för hela kedjan för att se om
de har divergerat. Jämförelsen täcker blockens hashar, alltså index, timestamp,
data och previousHash. Skiljer sig bara `signature` eller `publicKey` mellan två
kedjor får de samma rot, eftersom signaturen ligger utanför blockets hash.

Ett bevis binder blockets hash till kedjan, inte blockets innehåll till hashen.
Den som tar emot ett block och ett bevis måste därför fortfarande kontrollera
`hasValidHash()` och `hasValidSignature()`. En ändring där någon räknar om
blockets hash ändrar roten, medan en ändring där den gamla hashen ligger kvar
inte gör det, och den fångas av valideringen i stället. Båda varianterna har
egna tester.

Löv och inre noder hashas med olika prefix, och en udda nod i ett lager lyfts
upp oförändrad i stället för att paras med sig själv. Dubbleringen är den
klassiska Merkle-buggen: med den får `[A, B, C]` och `[A, B, C, C]` samma rot,
och två olika historiker går inte att skilja på. Roten över en känd lista är
låst till ett fast värde i testerna, på samma sätt som genesis-hashen, så att
format och ordning inte kan ändras oavsiktligt.

En lista som kommer utifrån gås igenom med index och inte med `every()`, som
hoppar över hål i en gles array, och antalet löv har samma tak som en inkommande
kedja. Utan det skulle `Array(3)` räknas som tre block och en lång lista kunna
låsa noden medan trädet byggs.

Roten och bevisen är ännu inte inkopplade i P2P-synken eller i något API mot
backend. Funktionerna finns och är testade, men de anropas inte av något annat än
testerna.

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

Funktionen validerar audit-datat, lägger till ett block och signerar det.
Backend anropar den via `server/src/services/auditLogger.js`.

Rollen måste vara en av `DOCTOR`, `NURSE`, `CARE_CENTER`, `PATIENT` eller
`UNAUTHORIZED`.

## Köra testerna

Från `server/`:

    node --test

147 tester ska passera, inklusive P2P-testerna i `server/src/p2p/` och
backendens route-tester.

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

Signering, Merkle Tree och fork mellan lika långa kedjor visas av ett eget
script, eftersom de inte syns i de två andra:

    node src/blockchain/demoAvancerat.js

Det tar under en sekund. Först ändras ett block och hashen räknas om, så att
hashen stämmer men signaturen inte gör det. Sedan visas ett Merkle-bevis som
slutar gälla när ett annat block i kedjan ändras. Till sist möts två lika långa
kedjor, och den med lägst hash på sista blocket blir kvar på båda.

## Implementerat

- Block med index, timestamp, data, previousHash och hash
- SHA-256 med deterministisk serialisering
- Deterministiskt genesis block
- Nya block länkade via previousHash
- `isChainValid()`, inklusive kontroll av genesis-blockets innehåll
- Audit-format enligt `docs/api-contract.md`
- Skydd som avvisar okända fält, journaltext och fritext i tillåtna fält
- `createAuditLog()` som gränssnitt mot backend
- `replaceChain()`, `fromJSON()` och `addReceivedBlock()` för synk mellan noder
- Ed25519-signering av varje audit-block
- Verifiering mot en uppsättning betrodda publika nycklar
- Skydd av kedjans sista block mot ändring med omräknad hash
- Fork-hantering för kedjor med samma längd, där lägst hash på sista blocket vinner
- Merkle-rot över kedjan och bevis för att ett enskilt block ligger i den
- Automatiska tester och demonstrationsscript

## Inte implementerat ännu

Detta är kommande arbete och finns alltså inte i koden:

- Merkle-roten inkopplad i P2P-synken eller i ett API mot backend
- Persistens; kedjan ligger i minnet och försvinner när servern stoppas
- Nyckelrotation; byts nodens nyckel ut blir redan signerade block i kedjan
  omöjliga att verifiera, vilket inte märks i dag eftersom kedjan ändå försvinner
  vid omstart
- Signaturen binder blocket till projektet men inte till en enskild driftmiljö.
  Används samma privata nyckel i två separata uppsättningar noder kan en giltig
  längre kedja från den ena tas emot av den andra. Så länge en nyckel bara finns i
  en uppsättning är det inget problem, och nycklar ska inte delas mellan miljöer.
