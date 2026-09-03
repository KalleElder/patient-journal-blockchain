# Server

Serverdelen av Patient Journal Blockchain.

Serverdelen kommer att innehålla backend, blockchain och P2P-kommunikation.

## Huvudansvariga

### Yamfu - Backend

Yamfu ansvarar huvudsakligen för:

- Express backend
- API-routes
- SQL-integration
- Authentication
- Authorization
- Roller och behörigheter
- Patienthantering
- Journalhantering
- AuditLogger
- Access log API
- Verification API

### Tim - Blockchain och P2P

Tim ansvarar huvudsakligen för:

- Block
- Blockchain
- Hashing
- Chain validation
- Access logs
- Digital signering
- Signature verification
- Merkle Tree
- P2P-kommunikation
- Socket.io mellan noder
- Blockchain-synkronisering
- Fork-hantering
- Longest-chain rule

## Planerad struktur

Serverdelen planeras ungefär enligt följande:

    server/
    ├── routes/
    ├── controllers/
    ├── middleware/
    ├── services/
    ├── db/
    ├── blockchain/
    └── p2p/

Den exakta strukturen kan ändras när implementationen påbörjas.

## Backend

Backend ansvarar för kommunikationen mellan frontend och systemets data.

Backend ska bland annat:

- hantera login
- identifiera användaren
- kontrollera användarens roll
- kontrollera behörighet
- läsa patientdata från SQL
- läsa journaldata från SQL
- skapa journalanteckningar i SQL
- skapa audit events vid journalåtkomst
- kommunicera med blockchain-modulen

Frontend får aldrig vara den enda platsen där behörighet kontrolleras.

## SQL

Medicinska journaluppgifter lagras i SQL-databasen.

Exempel:

- användare
- patienter
- journalanteckningar
- roller och relationer som behövs för behörighet

SQL-strukturen dokumenteras under:

database/

## AuditLogger

Backend ska ha ett gemensamt sätt att skapa audit events när
journalinformation används.

Planerat flöde:

    Request
       |
       v
    Authentication
       |
       v
    Authorization
       |
       v
    Journal / Database operation
       |
       v
    AuditLogger
       |
       v
    Blockchain

Audit-eventet ska endast innehålla information om åtkomsten.

Medicinsk journaltext får inte skickas till blockchain som audit-data.

## Blockchain

Blockchain används för access logs.

Ett block ska kunna kopplas till föregående block genom previousHash
och verifieras genom hashing.

Mer avancerade funktioner planeras att byggas på efter att den
grundläggande kedjan fungerar.

Dessa inkluderar:

- digital signering
- signature verification
- Merkle Tree
- P2P-synkronisering
- fork-hantering

## P2P

Projektet ska kunna köra minst två samtidiga servrar.

Exempel:

    localhost:3001
    localhost:3002

Noderna ska kunna kommunicera och synkronisera relevant information.

Socket.io kan användas för kommunikationen mellan noderna.

## Integration

Backend och blockchain ska använda det gemensamma audit-formatet som
dokumenteras i:

docs/api-contract.md

Yamfu och Tim ansvarar tillsammans för att gränssnittet mellan deras
delar fungerar.

Kalle hjälper till med integration och dokumentation när delarna ska
kopplas ihop.

## Viktig regel

Medicinsk journaltext lagras i SQL.

Access logs lagras i blockchain.

Medicinsk journaltext får aldrig lagras i blockchain.

## Status

Serverdelen är ännu inte implementerad.

Första målet är att få ett enkelt fungerande flöde från backend till
SQL och blockchain innan mer avancerade funktioner byggs.
