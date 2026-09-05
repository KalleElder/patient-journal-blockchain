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

## Implementerat i första auth-versionen

Avsnitten ovan bevarar projektets ursprungliga plan och status före denna PR.
Nu finns Express-grunden och authentication enligt nedan. SQL-integration
kommer i en senare PR; övrig planerad funktionalitet ovan är inte implementerad
av denna auth-PR.

### Installation och start

Från projektroten:

```powershell
npm install --prefix server
# Endast om .env saknas:
Copy-Item .env.example .env
```

Ange ett eget lokalt `JWT_SECRET` i projektrotens `.env`. Variabeln är
obligatorisk; servern stoppar om den saknas. Committa aldrig `.env` eller
`node_modules/`. Servern läser rotens `.env` oavsett arbetskatalog.
`PORT` använder 3001 om den saknas.

Starta från projektroten med `npm run start:server`, eller från `server/`
med `npm start`. För utveckling finns `npm run dev` i `server/`.

### Tillgängliga routes

- `GET /api/health`: publik, returnerar 200 med
  `{"status":"ok","service":"patient-journal-backend"}`.
- `POST /api/auth/login`: tar JSON med `username` och `password`.
  Returnerar 200 med `token` och `user` (`id`, `name`, `role`, samt
  `patientId` för PATIENT). Felaktiga uppgifter ger ett generellt 401-svar.
- `GET /api/auth/me`: kräver `Authorization: Bearer <token>` och returnerar
  verifierad `user` med `userId`, `role` och eventuellt `patientId`.
  Saknad eller ogiltig token ger 401.

JWT gäller i en timme. Lösenord och `passwordHash` returneras aldrig.

### Tillfälliga syntetiska användare

`doctor1` (DOCTOR), `nurse1` (NURSE), `carecenter1` (CARE_CENTER) och
`patient1` (PATIENT, `patientId: 7`) använder testlösenordet `password123`.
Endast bcrypt-hashar lagras i `src/data/users.js`. Kontona är för lokal testning.
UNAUTHORIZED beskriver ett obehörigt tillstånd och har inget testkonto.
