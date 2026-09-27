# Integration och testchecklista

Detta dokument används när projektets olika delar börjar kopplas ihop.

Kalle ansvarar för att checklistan hålls uppdaterad, men testerna genomförs
tillsammans med gruppen.

## 1. Installation

- [ ] Projektet går att klona från GitHub
- [ ] README innehåller installationsinstruktioner
- [ ] Alla dependencies går att installera
- [ ] .env.example innehåller nödvändiga variabler
- [ ] Riktig .env ligger inte i Git
- [ ] SQL-databasen går att skapa från projektets SQL-filer
- [ ] Testdata går att lägga in
- [ ] Frontend går att starta
- [x] Backend går att starta
- [x] Två servernoder går att starta samtidigt

## 2. Git och projektstruktur

- [ ] Ingen utveckling sker direkt på main
- [ ] Funktioner utvecklas på separata branches
- [ ] Pull Requests används
- [ ] Code review genomförs innan merge
- [ ] Commit-meddelanden är begripliga
- [ ] Minst två projektmöten per vecka dokumenteras
- [ ] Gruppkontrakt finns i repot

## 3. Login

- [ ] Login-sidan visas
- [ ] Giltig användare kan logga in
- [ ] Felaktiga uppgifter nekas
- [ ] Inloggad användares roll identifieras
- [x] Backend verifierar authentication
- [x] Skyddade API-routes kan inte användas utan giltig authentication

## 4. Roller

Kontrollera projektets olika användartyper:

- [ ] Läkare
- [ ] Sjuksköterska / ambulanspersonal
- [ ] Vårdcentral
- [ ] Patient
- [ ] Obehörig användare

För varje roll ska vi kontrollera att rätt information och funktioner visas.

## 5. Patientsökning

- [ ] Behörig användare kan söka efter patient
- [ ] Patientdata hämtas från backend
- [ ] Backend kontrollerar behörighet
- [ ] Obehörig användare nekas åtkomst
- [ ] Manipulation av patient-ID i URL ger inte otillåten åtkomst

## 6. Journal

- [x] Journalanteckningar hämtas från SQL
- [x] Medicinsk journaltext finns inte i blockchain
- [x] Behörig användare kan läsa journal
- [x] Behörig användare kan skapa journalanteckning
- [x] Journalanteckningen sparas i SQL
- [x] Journalanteckning visar korrekt författare
- [x] Journalanteckning visar korrekt tidpunkt

## 7. Journal visibility

Kontrollera projektets slutliga regler för:

- [ ] PRIVATE
- [ ] STAFF
- [ ] ALL

Kontrollera varje nivå med flera olika roller.

## 8. Patientkonto

- [ ] Patient kan logga in
- [ ] Patient kan endast komma åt tillåten journalinformation
- [ ] Patient kan inte byta patient-ID i URL och läsa någon annans journal
- [ ] Backend gör kontrollen och inte endast frontend

## 9. Audit logging

Vid relevant journalåtkomst:

- [x] Audit event skapas
- [x] userId är korrekt
- [x] patientId är korrekt
- [x] role är korrekt
- [x] action är korrekt
- [x] timestamp finns
- [x] Journaltext finns INTE i audit-eventet

## 10. Blockchain

- [x] Genesis block fungerar
- [x] Nya block kan skapas
- [x] Varje block har hash
- [x] Block länkas med previousHash
- [x] Kedjan kan valideras
- [x] Manipulerad kedja upptäcks
- [x] Access logs går att läsa från blockchain

## 11. Digital signering

Om funktionen ingår i slutversionen:

- [ ] Audit-data kan signeras
- [ ] Private key exponeras inte
- [ ] Signaturen kan verifieras med public key
- [ ] Manipulerad data misslyckas verifiering

## 12. P2P

Starta minst två noder.

Exempel:

    Node 1: localhost:3001
    Node 2: localhost:3002

Kontrollera:

- [x] Båda noderna kan köras samtidigt
- [x] Noderna kan ansluta till varandra
- [x] Node 1 kan skicka relevant information till Node 2
- [x] Node 2 kan skicka relevant information till Node 1
- [x] Blockchain-information kan synkroniseras
- [ ] Dubbletter eller felaktiga block hanteras

## 13. Journal mellan noder

Testscenario:

1. Logga in via Node 1.
2. Skapa en journalanteckning.
3. Kontrollera att anteckningen sparas i SQL.
4. Öppna systemet via Node 2.
5. Logga in som en behörig användare.
6. Öppna samma patient.

Förväntat resultat:

- [x] Journalanteckningen går att läsa via Node 2
- [x] Behörighetsreglerna gäller även via Node 2
- [x] Relevant access log finns i blockchain
- [x] Blockchain-noderna är synkroniserade

## Verifierat integrationstest 2026-09-25

Kalle genomförde ett manuellt end-to-end-test från aktuell `main` med två
samtidiga servernoder på port 3001 och 3002.

Verifierat flöde:

1. Node 1 startades på port 3001 med Node 2 som peer.
2. Node 2 startades på port 3002 med Node 1 som peer.
3. Noderna anslöt via Socket.io och rapporterade synkroniserade kedjor.
4. `doctor1` loggade in via Node 1 och fick en giltig JWT.
5. En journalanteckning skapades via Node 1 och API:t svarade HTTP 201.
6. Samma journalanteckning lästes via Node 2 och API:t svarade HTTP 200.
7. Access-loggen innehöll `CREATE_JOURNAL_ENTRY` och `READ_JOURNAL`.
8. Båda blockkedjorna hade samma längd och samma senaste hash.
9. Båda kedjorna rapporterades som giltiga.
10. Journaltexten söktes i båda blockkedjorna och förekom inte där.

Vid testet hade båda noderna tre block: genesis-blocket samt audit-block för
`CREATE_JOURNAL_ENTRY` och `READ_JOURNAL`.

Serverns automatiska testsvit hade dessutom 85 av 85 godkända tester.
Frontendens lint kördes utan varningar eller fel och frontendens
produktionsbygge slutfördes utan fel.

## 14. Socket.io / realtid

- [ ] Socket-anslutning fungerar
- [ ] Klient kan ta emot relevanta events
- [ ] Journaluppdatering kan visas utan onödig manuell omladdning
- [x] P2P-events fungerar mellan servernoder
- [x] Medicinsk journaltext läcker inte via audit-events

## 15. Fork-hantering

Om funktionen ingår i slutversionen:

- [ ] Två noder kan ha olika kedjor tillfälligt
- [ ] Kedjorna kan jämföras
- [ ] Ogiltig kedja accepteras inte
- [ ] Projektets valda chain-regel fungerar efter återanslutning

## 16. Merkle Tree

Om funktionen ingår i slutversionen:

- [ ] Flera audit logs kan grupperas
- [ ] Merkle root skapas korrekt
- [ ] Ändrad data påverkar Merkle root
- [ ] Verifiering fungerar enligt implementationen

## 17. Frontend

- [ ] Login-vy fungerar
- [ ] Patientsökning fungerar
- [ ] Patientvy fungerar
- [ ] Journalvy fungerar
- [ ] Formulär för ny journalanteckning fungerar
- [ ] Access denied visas när det behövs
- [ ] Access logs kan visas
- [ ] UI anpassas efter användarens roll
- [ ] Fel från backend visas på ett begripligt sätt

## 18. Blockchain verification UI

Om funktionen ingår i slutversionen:

- [ ] Verifierad logg kan visas som verifierad
- [ ] Misslyckad verifiering kan visas tydligt
- [ ] Frontend gör inte själv den kryptografiska verifieringen

## 19. Säkerhetskontroll

- [ ] Inga riktiga lösenord finns i Git
- [ ] Ingen riktig .env är commitad
- [ ] Inga privata nycklar är commitade
- [ ] Lösenord lagras inte i klartext
- [x] Backend kontrollerar authorization
- [x] URL-manipulation ger inte otillåten åtkomst
- [x] Medicinsk journaltext finns inte i blockchain

## 20. README inför inlämning

- [ ] Projektbeskrivning finns
- [ ] Gruppmedlemmar finns
- [ ] Screenshots finns
- [ ] Installationsinstruktioner finns
- [ ] Startinstruktioner finns
- [ ] Databasstruktur finns beskriven
- [ ] SQL CREATE/schema-fil finns i repot
- [ ] Roller och behörigheter finns beskrivna
- [ ] Blockchain-delen finns beskriven
- [ ] P2P-delen finns beskriven

## 21. Demo

Innan redovisningen ska gruppen kunna demonstrera ett komplett flöde.

Planerat demoflöde:

1. Starta SQL-databasen.
2. Starta Node 1.
3. Starta Node 2.
4. Starta frontend.
5. Logga in.
6. Sök efter en patient.
7. Öppna patientens journal.
8. Visa rollbaserad behörighet.
9. Skapa en journalanteckning.
10. Visa att anteckningen finns i SQL/journalvyn.
11. Öppna samma journal via den andra noden.
12. Visa access log.
13. Visa blockchain.
14. Visa att blockchainen är giltig.
15. Visa P2P/synkronisering.

Eventuella avancerade funktioner som digital signering, Merkle Tree,
fork-hantering och verification badge demonstreras om de ingår i den
färdiga implementationen.

## 22. Slutkontroll

- [ ] Senaste main är testad
- [ ] Projektet fungerar från en ren clone
- [ ] Inga viktiga branches saknar PR
- [ ] Alla viktiga PR:s är reviewade
- [ ] Standups är dokumenterade
- [ ] README är uppdaterad efter den faktiska implementationen
- [ ] Screenshots är aktuella
- [ ] Gruppen har testat presentationen
- [ ] Alla vet vilken del de ska presentera
