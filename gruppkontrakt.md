# Gruppkontrakt

## Grupp

- Kalle
- Yamfu
- Tim
- Josef

## Projekt

Patient Journal Blockchain

## Syfte

Vi ska tillsammans utveckla ett journalsystem där medicinska journaluppgifter
lagras i en SQL-databas och där åtkomst till journalerna loggas i en blockchain.

Medicinsk journaltext får aldrig lagras i blockkedjan.

## Kommunikation

Vi kommunicerar i vår gemensamma gruppchatt.

Om någon:

- fastnar
- behöver hjälp
- blir sjuk
- inte kan arbeta enligt planen
- riskerar att inte hinna sin uppgift

ska personen informera gruppen så tidigt som möjligt.

Vi försöker lösa problem tillsammans istället för att vänta till deadline.

## Projektmöten

Vi har två fasta projektmöten per vecka:

- Måndagar kl. 19:00
- Torsdagar kl. 19:00

Planerade möten:

- 7 september 2026 kl. 19:00
- 10 september 2026 kl. 19:00
- 14 september 2026 kl. 19:00
- 17 september 2026 kl. 19:00
- 21 september 2026 kl. 19:00
- 24 september 2026 kl. 19:00
- 28 september 2026 kl. 19:00
- 1 oktober 2026 kl. 19:00

Möten dokumenteras i:

docs/standups/

## Ansvarsfördelning

Ansvarsområdena är huvudansvar.

Vi får hjälpa varandra, parkoda och byta uppgifter om vi kommer överens om det
i gruppen.

### Kalle

Huvudansvar:

- GitHub-repository
- Projektstruktur
- Git-arbetsflöde
- Pull Requests
- README
- Gruppkontrakt
- Dokumentation
- Standups
- API-kontrakt
- Integration
- Installationstest
- Sluttest
- Stöd inför redovisningen

### Yamfu

Huvudansvar:

- Express backend
- SQL-databas
- Users
- Patients
- Journal entries
- Login/authentication
- Roller
- Authorization
- Behörighetskontroller
- Patient-routes
- Journal-routes
- AuditLogger
- Access log API
- Verification API

### Tim

Huvudansvar:

- Block
- Blockchain
- Hashing
- Chain validation
- Access logs
- Public/private key-signering
- Signature verification
- Merkle Tree
- P2P
- Socket.io mellan servrar
- Synkronisering mellan server 3001 och server 3002
- Fork-hantering
- Longest-chain rule

Medicinsk journaltext får aldrig lagras i blockchain.

### Josef

Huvudansvar:

- Frontend
- Login-sida
- Patientsökning
- Patientvy
- Journalvy
- Skapa journalanteckningar
- Access logs
- Access denied
- Socket.io-client
- Liveuppdateringar
- Realtidsvy
- Verification badge

## Git-regler

Ingen pushar direkt till main.

Arbetet ska normalt göras så här:

1. Uppdatera lokal main
2. Skapa en egen feature branch
3. Implementera uppgiften
4. Testa lokalt
5. Commit
6. Push
7. Skapa Pull Request
8. En annan gruppmedlem gör code review
9. Eventuella problem rättas
10. Merge till main

Exempel på branches:

- setup/project-foundation
- feature/auth
- feature/patient-api
- feature/blockchain
- feature/p2p
- feature/login-ui
- feature/patient-journal

## Code Review

Vid code review kontrollerar vi bland annat:

- fungerar koden?
- är koden begriplig?
- finns uppenbara buggar?
- följer lösningen projektets struktur?
- påverkar ändringen någon annans modul?
- finns lösenord eller hemliga nycklar hårdkodade?
- råkar medicinsk journaltext skickas till blockchain?

## Integration

Kod som påverkar flera delar av projektet ska kommuniceras med berörda
gruppmedlemmar.

Yamfu och Tim kommer överens om gränssnittet mellan backend och blockchain.

Yamfu och Josef kommer överens om API-format mellan backend och frontend.

Tim, Yamfu och Josef kommer överens om hur blockchain-verifiering visas i
frontend.

Kalle ansvarar för att den gemensamma integrationen hålls dokumenterad och
hjälper till när delarna ska kopplas ihop.

## Beslut

Mindre beslut inom en egen modul kan fattas av den som ansvarar för modulen.

Beslut som påverkar flera delar av projektet tas tillsammans.

## Definition of Done

En uppgift betraktas som klar när den:

- fungerar lokalt
- är testad i rimlig omfattning
- följer projektets struktur
- är commitad
- är pushad
- har en Pull Request
- har blivit code reviewad
- är mergad till main
- inte förstör befintlig funktionalitet

## GDPR och journaldata

Medicinska journaluppgifter lagras endast i SQL-databasen.

Blockkedjan används för audit/access logs.

Vi ska kontrollera extra noggrant att medicinsk journaltext inte råkar lagras
i blockchain.

## Arbetsprincip

Vi prioriterar först en enkel fungerande version.

Därefter bygger vi vidare med mer avancerade funktioner.

Prioriterad ordning:

1. Projektgrund
2. Login och SQL
3. Grundläggande frontend
4. Journalflöde
5. Grundläggande blockchain
6. Integration
7. AuditLogger
8. Signering
9. P2P
10. Realtidsuppdateringar
11. Fork-hantering
12. Merkle Tree
13. Verification badge
14. Tester
15. Dokumentation
16. Redovisning

## Deadline

Officiell deadline:

Fredag 2 oktober 2026 kl. 11:00

Betygsskala:

IG/G

Intern målsättning:

Vi försöker ha den kompletta fungerande versionen klar senast torsdag
1 oktober 2026.

## Godkännande

Gruppen går tillsammans igenom kontraktet och godkänner arbetssättet.

- [ ] Kalle
- [ ] Yamfu
- [ ] Tim
- [ ] Josef
