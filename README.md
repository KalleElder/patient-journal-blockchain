# Patient Journal Blockchain

Grupparbete där vi bygger ett journalsystem där medicinska journaluppgifter
lagras i en SQL-databas och åtkomst till journalerna loggas i en blockchain.

## Gruppmedlemmar

- Kalle
- Yamfu
- Tim
- Josef

## Projektinformation

- Deadline: fredag 2 oktober 2026 kl. 11:00

## Projektets mål

Systemet ska innehålla:

- Frontend/UI i ett ramverk
- Login
- Rollbaserad åtkomst
- Patientvy
- Backend och routing
- SQL-databas för medicinska uppgifter
- Blockchain för access logs
- Minst två samtidiga servrar
- P2P-kommunikation
- Socket.io/broadcasting
- Pull Requests och code review
- Dokumenterade projektmöten
- Gruppkontrakt
- README

## GDPR

Medicinska journaluppgifter ska ALDRIG lagras på blockkedjan.

Själva journalen lagras i SQL-databasen.

Blockkedjan används för att logga åtkomst till journalen, exempelvis:

- vem som utförde åtkomsten
- vilken patient åtkomsten gällde
- användarens roll
- typ av aktivitet
- tidpunkt

## Roller

Systemet ska stödja:

1. Läkare
2. Sjuksköterska / ambulanspersonal
3. Vårdcentral
4. Patient
5. Obehörig

## Ansvarsfördelning

Ansvarsområdena är huvudansvar.

Vi får hjälpa varandra, parkoda eller byta uppgifter om vi kommer överens
om det i gruppen.

### Kalle - Projektgrund och integration

Ansvar:

- GitHub-repository
- Projektstruktur
- Git-arbetsflöde
- Pull Requests
- README
- Gruppkontrakt
- Dokumentation
- Standups
- API-kontrakt
- Integration mellan projektets delar
- Installationstest
- Sluttest
- Hjälpa till inför redovisningen

### Yamfu - Backend, SQL och behörigheter

Ansvar:

- Express backend
- SQL-databas
- Users
- Patients
- Journal entries
- Login/authentication
- Roller
- Behörighetskontroller
- Patient-routes
- Journal-routes
- AuditLogger
- Access log API
- Verification API

Backend ska alltid kontrollera användarens behörighet.

### Tim - Blockchain och P2P

Ansvar:

- Block
- Blockchain
- Hashing
- Chain validation
- Access logs
- Public/private key-signering
- Verifiering av signaturer
- Merkle Tree
- P2P
- Socket.io mellan servrar
- Synkronisering mellan server 3001 och 3002
- Fork-hantering
- Longest-chain rule

Medicinsk journaltext får aldrig lagras i blockchain.

### Josef - Frontend

Ansvar:

- Login-sida
- Patientsökning
- Patientvy
- Journalvy
- Skapa journalanteckning
- Access logs
- Access denied
- Socket.io-client
- Liveuppdateringar
- Realtidsvy
- Verification badge

## Planerat API

POST /api/auth/login

GET /api/patients

GET /api/patients/:id

GET /api/patients/:id/journal

POST /api/patients/:id/journal

GET /api/patients/:id/access-logs

Det mer detaljerade API-kontraktet finns i docs/api-contract.md.

## P2P

Systemet ska kunna köra minst två samtidiga servrar, exempelvis:

- localhost:3001
- localhost:3002

Noderna ska kunna kommunicera och synkronisera information via sockets.

## Git-arbetsflöde

Vi pushar inte direkt till main.

Arbetsflöde:

1. Uppdatera main
2. Skapa en feature branch
3. Implementera uppgiften
4. Commit
5. Push
6. Skapa Pull Request
7. Code review av en annan gruppmedlem
8. Merge till main

Exempel på branches:

- setup/project-foundation
- feature/auth
- feature/patient-api
- feature/blockchain
- feature/p2p
- feature/login-ui
- feature/patient-journal
- feature/access-logs

## Projektmöten / Standups

Vi har två fasta projektmöten per vecka:

- Måndagar kl. 19:00
- Torsdagar kl. 19:00

Planerade möten:

| Datum | Tid | Fokus |
| --- | --- | --- |
| 7 september | 19:00 | Projektstart och arbetsfördelning |
| 10 september | 19:00 | Grundfunktioner |
| 14 september | 19:00 | Backend, frontend och blockchain |
| 17 september | 19:00 | Integration |
| 21 september | 19:00 | P2P, sockets och behörigheter |
| 24 september | 19:00 | Integration och tester |
| 28 september | 19:00 | Sluttest, README och demo |
| 1 oktober | 19:00 | Slutkontroll och presentation |

Varje möte dokumenteras i docs/standups/.

## Arbetsordning

Vi bygger först en enkel fungerande version och lägger sedan till de mer
avancerade delarna.

1. Projektgrund
2. Login och SQL
3. Grundläggande frontend
4. Journalflöde
5. Grundläggande blockchain
6. Första end-to-end-flödet
7. AuditLogger
8. Signering
9. P2P
10. Realtidsuppdateringar
11. Fork-hantering
12. Merkle Tree
13. Verification badge
14. Tester
15. Dokumentation och redovisning

## Första gemensamma mål

Det första kompletta flödet vi vill få fungerande är:

Login -> öppna patient -> kontrollera behörighet -> hämta journal från SQL
-> skapa access log -> lagra access log i blockchain.

## Intern deadline

Vi försöker ha en komplett fungerande version klar senast torsdag
1 oktober 2026.

Sista tiden används till tester, buggrättning, README, screenshots,
installationstest och förberedelse av redovisningen.

## Aktuell projektstatus

Projektet är under aktiv utveckling. Följande delar är implementerade och
verifierade på `main`.

### Projektgrund och integration

Kalle har satt upp och underhållit projektets gemensamma grund:

- repository- och projektstruktur
- gruppkontrakt
- Git workflow med feature branches, Pull Requests och code review
- API-kontrakt
- integrationsdokumentation
- dokumentation för roller och behörigheter
- gemensam miljökonfiguration
- exempelkonfiguration för två servernoder
- gemensamma npm-scripts
- lokal setup-guide
- integrations- och testchecklista
- dokumenterade standups

Ändringar utvecklas på separata branches och granskas genom Pull Requests innan
de mergas till `main`.

### Backend, SQL och authentication

Backend använder Express och SQLite.

Följande finns på `main`:

- login via `POST /api/auth/login`
- bcrypt för lösenordsverifiering
- JWT-baserad authentication
- auth middleware
- skyddad `GET /api/auth/me`
- SQLite-databas för users, patients och journal entries
- testanvändare för `DOCTOR`, `NURSE`, `CARE_CENTER` och `PATIENT`
- patient-API
- journal-API
- rollbaserade behörighetskontroller
- skydd mot otillåten åtkomst genom ändrat patient-ID
- journalnivåerna `PRIVATE`, `STAFF` och `ALL`
- access-log API via `GET /api/patients/:id/access-logs`

Backend ansvarar för authorization. Frontend används inte som enda
behörighetskontroll.

### Frontend

Frontend är byggd med React och Vite.

Följande finns på `main`:

- login
- JWT-baserad session mot backend
- logout
- rollbaserad startsida
- patientlista för vårdpersonal
- sökning/filter av patienter
- journalvy
- formulär för nya journalanteckningar
- val av `PRIVATE`, `STAFF` och `ALL`
- patientkonto som går direkt till den egna journalen
- felhantering för relevanta API-fel

Frontendens lint och production build har verifierats utan fel.

### Audit logging och blockchain

Journalflödet är kopplat till blockchainens auditlogg.

Följande är implementerat:

- `Block` och `Blockchain`
- SHA-256-hashning med deterministisk serialisering
- deterministiskt genesis block
- block länkade via `previousHash`
- validering av kedjan
- `AuditLogger` mellan backend och blockchain
- `CREATE_JOURNAL_ENTRY` vid skapad journalanteckning
- `READ_JOURNAL` vid läsning av journal
- `ACCESS_DENIED` för implementerade nekade journalförsök
- access logs med `userId`, `patientId`, `role`, `action` och `timestamp`
- validering som hindrar journaltext och otillåtna fält från att lagras i
  blockchain

Medicinsk journaltext lagras i SQL och ska aldrig lagras i blockchain.

Blockchainen ligger för närvarande i minnet och återställs vid omstart av
servern.

### P2P mellan servernoder

P2P-synkronisering är implementerad med Socket.io.

Följande finns på `main`:

- två samtidiga servernoder
- Socket.io-server och klient per nod
- `REQUEST_CHAIN`, `CHAIN` och `NEW_BLOCK`
- utbyte av blockchain vid anslutning
- broadcast av nya audit-block
- validering av mottagen blockchain-data
- `replaceChain()` som accepterar en giltig längre kedja
- synkronisering av audit-block mellan noder

Exempel på två noder:

    PORT=3001 PEER_URL=http://localhost:3002 npm start --prefix server
    PORT=3002 PEER_URL=http://localhost:3001 npm start --prefix server

Kedjor med samma längd har ännu ingen färdig fork-hantering.

### Verifierat end-to-end-test

Den 25 september 2026 genomfördes ett manuellt integrationstest från aktuell
`main` med två samtidiga servernoder.

Testet verifierade följande flöde:

1. `doctor1` loggade in via Node 1 på port 3001.
2. En journalanteckning skapades via Node 1 och API:t svarade HTTP 201.
3. Samma journalanteckning lästes via Node 2 på port 3002 med HTTP 200.
4. `CREATE_JOURNAL_ENTRY` och `READ_JOURNAL` skapades som audit-events.
5. Audit-events synkroniserades mellan blockchain-noderna.
6. Båda noderna hade samma kedjelängd och samma senaste hash.
7. Båda kedjorna rapporterades som giltiga.
8. Journaltexten förekom inte i blockchain på någon av noderna.

Mer information finns i `docs/integration/test-checklist.md`.

### Automatiska tester

Serverns testsvit körs från projektroten med:

    npm run test:server

Senaste verifieringen från `main`:

- 85 tester
- 85 godkända
- 0 misslyckade

Frontend har dessutom verifierats med:

    npm run lint --prefix client
    npm run build --prefix client

Båda kommandona slutfördes utan fel.

### Återstående arbete

Följande delar återstår eller behöver slutverifieras:

- frontendvy för access logs
- Socket.io-klient för liveuppdateringar i frontend
- digital signering om den ingår i slutversionen
- Merkle Tree om det ingår i slutversionen
- fork-hantering för kedjor med samma längd om den ingår i slutversionen
- verification badge om den ingår i slutversionen
- clean-clone installationstest
- slutliga screenshots till README
- slutlig demo och presentation

Den faktiska slutversionen dokumenteras i README efter den sista
integrations- och installationstesten.
