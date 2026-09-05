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
verifierade.

### Projektgrund och integration

Kalle har satt upp projektets gemensamma grund:

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

Ändringar utvecklas på separata branches och granskas genom Pull Requests innan
de mergas till main.

### Backend och authentication

Yamfu har implementerat den första backend- och authentication-grunden.

Följande finns på main:

- Express-backend
- `GET /api/health`
- `POST /api/auth/login`
- bcrypt för lösenordsverifiering
- JWT-baserad authentication
- auth middleware
- skyddad `GET /api/auth/me`
- testanvändare för rollerna `DOCTOR`, `NURSE`, `CARE_CENTER` och `PATIENT`

Authentication har efter merge verifierats från main genom manuella
integrationstester.

Verifierade scenarier:

- health endpoint svarar med HTTP 200
- korrekt login ger HTTP 200 och JWT
- felaktigt lösenord ger HTTP 401
- skyddad route med giltig Bearer-token ger HTTP 200
- skyddad route utan token ger HTTP 401
- `passwordHash` exponeras inte i API-responsen

### Inte implementerat ännu

Följande delar återstår eller är planerade för kommande iterationer:

- SQL-integration
- patient-API
- journal-API
- blockchain för access logs
- P2P-synkronisering
- frontend
- Socket.io-integration
- slutlig end-to-end-integration

Medicinsk journaldata ska lagras i SQL och ska inte lagras i blockchain.
Blockchain används för accessloggning och spårbarhet.
