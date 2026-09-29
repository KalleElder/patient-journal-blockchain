# Server

Backenddelen av Patient Journal Blockchain.

Servern innehåller Express-API, SQLite-integration, authentication,
authorization, audit logging, blockchain och P2P-synkronisering.

## Ansvarsområden

### Yamfu - Backend, SQL och behörigheter

Huvudansvar:

- Express backend
- API-routes
- SQLite
- authentication med bcrypt och JWT
- authorization och roller
- patienter och journalanteckningar
- access-log API

### Tim - Blockchain och P2P

Huvudansvar:

- Block och Blockchain
- SHA-256-hashning
- chain validation
- audit logs
- Ed25519-signering
- verifiering av signaturer
- P2P-kommunikation
- Socket.io mellan noder
- blockchain-synkronisering
- fork-hantering

Merkle Tree återstår att implementera.

Kalle arbetar med integration, gemensam projektsetup, tester och dokumentation.

## Arkitektur

Det huvudsakliga flödet är:

```text
Frontend
   |
   v
Express API
   |
   +--> Authentication / Authorization
   |
   +--> SQLite
   |      |
   |      +--> users
   |      +--> patients
   |      +--> journal_entries
   |
   +--> AuditLogger
          |
          v
      Blockchain
          |
          v
      P2P / Socket.io
```

Medicinska journaluppgifter lagras endast i SQL.

Blockchain innehåller audit-metadata om journalåtkomst och får aldrig innehålla
medicinsk journaltext.

## Installation

Den fullständiga installationsguiden finns i projektets root-README.

Från projektroten installeras dependencies med:

```bash
npm run install:all
```

Skapa därefter lokal miljökonfiguration:

```bash
cp .env.example .env
```

`.env` ska innehålla ett lokalt `JWT_SECRET` samt blockchainens
signeringskonfiguration.

Generera Ed25519-nycklar med:

```bash
npm run keys:generate --prefix server
```

Lägg de genererade värdena för `BLOCKCHAIN_PRIVATE_KEY` och
`BLOCKCHAIN_TRUSTED_KEYS` i `.env`.

Den privata nyckeln och `.env` får aldrig committas.

## Databas

SQLite används för:

- användare
- patienter
- journalanteckningar

Databasschemat finns i:

```text
database/schema.sql
```

Testdata finns i:

```text
database/seed.sql
```

Initiera databasen från projektroten:

```bash
npm run db:init
```

Kommandot skapar om den lokala databasen från grunden och lägger in testdata.

Standardfilen är:

```text
database/patient_journal.db
```

Databasfilen committas inte.

## Starta servern

Från projektroten:

```bash
npm run start:server
```

Servern kör som standard på:

```text
http://localhost:3001
```

Health check:

```text
GET /api/health
```

För utveckling kan servern även startas från `server/` med:

```bash
npm run dev
```

## Authentication och roller

Systemet använder bcrypt för lösenord och JWT för authentication.

JWT gäller i en timme.

Rollerna som används av backend är:

- `DOCTOR`
- `NURSE`
- `CARE_CENTER`
- `PATIENT`

Obehöriga requests utan giltig authentication behandlas som obehöriga och får
inte åtkomst till skyddade routes.

Backend ansvarar alltid för authorization. Frontend är aldrig den enda
behörighetskontrollen.

## Journalens synlighetsnivåer

Journalanteckningar har någon av följande nivåer:

- `PRIVATE` - endast användaren som skapade anteckningen
- `STAFF` - vårdpersonal
- `ALL` - vårdpersonal och rätt patient

Patientkonton får endast läsa sin egen journal och endast anteckningar med
`ALL`.

## API

### Publika routes

#### `GET /api/health`

Returnerar serverstatus.

#### `POST /api/auth/login`

Body:

```json
{
  "username": "doctor1",
  "password": "password123"
}
```

Vid korrekt login returneras JWT-token och användarinformation.

### Skyddade routes

#### `GET /api/auth/me`

Returnerar den verifierade inloggade användaren.

#### `GET /api/patients`

Vårdpersonal kan lista patienter.

Patientkonton nekas åtkomst.

#### `GET /api/patients/:id`

Vårdpersonal kan läsa patientdata.

Patientkonton kan endast läsa sin egen patient.

#### `GET /api/patients/:id/journal`

Returnerar journalanteckningar som den inloggade användaren har behörighet att
se.

#### `POST /api/patients/:id/journal`

Vårdpersonal kan skapa en journalanteckning.

Exempel:

```json
{
  "content": "Patienten mår bättre.",
  "visibility": "ALL"
}
```

Journaltexten lagras i SQLite och skickas aldrig till blockchain.

#### `GET /api/patients/:id/access-logs`

Returnerar audit-historik för patienten enligt användarens behörighet.

Genesis-blocket returneras inte som en access log.

Det mer detaljerade API-kontraktet finns i:

```text
docs/api-contract.md
```

## Audit logging

Journalflödet är kopplat till ett gemensamt `AuditLogger`-lager.

Implementerade audit-events omfattar:

- `READ_JOURNAL`
- `CREATE_JOURNAL_ENTRY`
- `ACCESS_DENIED`

Audit-data innehåller metadata som:

- `userId`
- `patientId`
- `role`
- `action`
- `timestamp`

Medicinsk journaltext får aldrig ingå i audit-data.

## Blockchain

Blockchainen implementerar bland annat:

- deterministiskt genesis block
- SHA-256
- deterministisk serialisering
- `previousHash`
- validering av kedjan
- validering av audit-data
- Ed25519-signering av audit-block
- verifiering mot betrodda publika nycklar

Genesis-blocket är osignerat. Audit-block ska vara korrekt signerade av en
betrodd nyckel.

Blockchainen ligger för närvarande i minnet och återställs när servern startas
om.

Mer information finns i:

```text
server/src/blockchain/README.md
```

## P2P

P2P-synkronisering använder Socket.io.

Noderna utbyter bland annat:

- `REQUEST_CHAIN`
- `CHAIN`
- `NEW_BLOCK`

En mottagen kedja eller ett mottaget block valideras innan det accepteras.

En giltig längre kedja kan ersätta den lokala kedjan. Vid två giltiga kedjor
med samma längd används hashen på sista blocket som deterministisk
tie-breaker; lägst hash vinner.

En kortare kedja ersätter inte en längre kedja.

### Två noder

Exempel från projektroten:

```bash
PORT=3001 PEER_URL=http://localhost:3002 npm start --prefix server
PORT=3002 PEER_URL=http://localhost:3001 npm start --prefix server
```

Noderna behöver lita på varandras publika signeringsnycklar. Två lokala noder
som använder samma `.env` kan därför kommunicera direkt i den nuvarande
testkonfigurationen.

Mer information finns i:

```text
server/src/p2p/README.md
```

## Testanvändare

Efter `npm run db:init` finns följande lokala testkonton:

| Användarnamn | Lösenord | Roll |
| --- | --- | --- |
| `doctor1` | `password123` | `DOCTOR` |
| `nurse1` | `password123` | `NURSE` |
| `carecenter1` | `password123` | `CARE_CENTER` |
| `patient1` | `password123` | `PATIENT` |

Testkontona är endast avsedda för lokal utveckling och demonstration.

## Tester

Från projektroten:

```bash
npm run test:server
```

Den 27 september 2026 verifierades den aktuella versionen med:

```text
126 tester
126 godkända
0 misslyckade
```

Testerna täcker bland annat authentication, behörigheter, journal-API,
access logs, audit logging, blockchain, signering, fork-hantering och
P2P-synkronisering.

## Viktig säkerhetsregel

**Medicinsk journaltext lagras i SQL.**

**Audit logs lagras i blockchain.**

**Medicinsk journaltext får aldrig lagras i blockchain.**
