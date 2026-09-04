# Integration

Detta dokument beskriver hur vår projektets olika delar ska kopplas ihop.

Syftet är att frontend, backend, SQL-databas och blockchain ska kunna utvecklas
parallellt utan att använda olika dataformat eller göra motstridiga antaganden.

## Övergripande flöde

Frontend kommunicerar med backend via HTTP och Socket.io.

Backend ansvarar för:

- authentication
- authorization
- patientdata
- journaldata
- SQL-kommunikation
- audit events

Blockchain ansvarar för:

- access logs
- hashing
- chain validation
- digital signering
- P2P-synkronisering
- verifiering

## Journalflöde

Planerat flöde när en användare öppnar en journal:

1. Frontend skickar request till backend.
2. Backend identifierar användaren.
3. Backend kontrollerar användarens roll och behörighet.
4. Backend hämtar journaldata från SQL.
5. Backend skapar ett audit event.
6. Audit-eventet skickas till blockchain-modulen.
7. Blockchain skapar eller uppdaterar access-loggen.
8. Backend returnerar journaldata till frontend.

Medicinsk journaltext får aldrig skickas med i blockchainens audit-event.

## Skapa journalanteckning

Planerat flöde:

1. Frontend skickar journalanteckningen till backend.
2. Backend kontrollerar authentication.
3. Backend kontrollerar authorization.
4. Journalanteckningen sparas i SQL.
5. Backend skapar ett audit event för händelsen.
6. Audit-eventet skickas till blockchain.
7. Backend skickar response till frontend.
8. Socket.io kan användas för att meddela andra anslutna klienter/noder.

## Backend och SQL

Yamfus backend ansvarar för all direkt kommunikation med SQL-databasen.

Frontend ska aldrig ansluta direkt till databasen.

Blockchain ska aldrig användas som lagringsplats för medicinsk journaltext.

## Backend och Blockchain

Backend ska anropa blockchain-modulen genom ett gemensamt audit-format.

Planerat audit-event:

    {
      "userId": 3,
      "patientId": 7,
      "role": "DOCTOR",
      "action": "READ_JOURNAL",
      "timestamp": "2026-09-10T19:32:00Z"
    }

Följande information ska inte finnas i audit-eventet:

- journaltext
- diagnos
- behandlingstext
- andra medicinska fritextfält

## Frontend och Backend

Josefs frontend ska använda API-kontraktet i:

docs/api-contract.md

Frontend ska inte själv avgöra om en användare faktiskt har behörighet.

Frontend kan anpassa vad som visas utifrån rollen, men backend gör den slutliga
säkerhetskontrollen.

## P2P

Systemet ska kunna köra minst två samtidiga servernoder.

Planerat exempel:

- Node 1: localhost:3001
- Node 2: localhost:3002

När en journalhändelse sker på en nod ska relevant audit/blockchain-information
kunna synkroniseras med den andra noden.

Journaldata ska fortfarande hämtas från SQL-databasen och inte från blockchain.

## Socket.io

Socket.io kan användas för:

- P2P-kommunikation mellan servernoder
- journaluppdateringar
- live-aktivitet
- blockchain-synkronisering

Planerade event-namn finns i:

docs/api-contract.md

## Integration mellan gruppmedlemmar

### Yamfu och Tim

Ansvarar tillsammans för gränssnittet:

Backend -> AuditLogger -> Blockchain

### Yamfu och Josef

Ansvarar tillsammans för:

Frontend -> HTTP API -> Backend

### Tim och Josef

Blockchain-verifiering ska exponeras via backend så att frontend kan visa
verifieringsstatus utan att själv implementera kryptografisk verifiering.

### Kalle

Kalle ansvarar för att:

- integrationskontrakt hålls uppdaterade
- API-format dokumenteras
- konflikter mellan moduler upptäcks tidigt
- installation från en ren clone testas
- slutlig integration testas
- README uppdateras när implementationen ändras

## Första integrationsmål

Första kompletta flödet som ska fungera:

Login
-> öppna patient
-> backend kontrollerar behörighet
-> journal hämtas från SQL
-> audit-event skapas
-> blockchain loggar åtkomsten
-> journal visas i frontend

När detta fungerar kan mer avancerade funktioner byggas ovanpå.

## Ändringar

Om någon behöver ändra ett gemensamt API, event-namn eller dataformat ska
berörda gruppmedlemmar informeras innan ändringen mergas till main.
