# Lokal utvecklingsmiljö

Detta dokument beskriver hur gruppmedlemmar sätter upp projektet lokalt.

Dokumentet uppdateras när frontend, backend, databas och blockchain har
implementerats.

## 1. Klona projektet

    git clone https://github.com/KalleElder/patient-journal-blockchain.git
    cd patient-journal-blockchain

## 2. Kontrollera main

Hämta alltid senaste versionen innan du skapar en ny branch:

    git checkout main
    git pull origin main

## 3. Skapa en feature-branch

Exempel:

    git checkout -b feature/auth

Arbeta inte direkt på main.

Mer information finns i:

    docs/git-workflow.md

## 4. Miljövariabler

Projektet använder lokala miljövariabler.

Skapa en lokal .env från exempelkonfigurationen:

    cp .env.example .env

Den riktiga .env-filen får inte committas.

.env.example innehåller endast exempelvärden och tomma konfigurationsfält.

## 5. Servernoder

Projektet ska kunna köras med minst två servernoder.

Planerad konfiguration:

    Node 1
    PORT=3001
    NODE_NAME=node-1
    PEER_URL=http://localhost:3002

    Node 2
    PORT=3002
    NODE_NAME=node-2
    PEER_URL=http://localhost:3001

Exempelkonfiguration för Node 2 finns i:

    .env.node2.example

Den exakta startmetoden för två noder dokumenteras när backend och
P2P-implementationen är färdig.

## 6. Installera dependencies

När både server och client har egna package.json-filer ska dependencies kunna
installeras från projektets rot med:

    npm run install:all

Det motsvarar installation i:

    server/
    client/

## 7. Starta backend

När backend är implementerad är det planerade kommandot:

    npm run start:server

Backendens egna scripts definieras i:

    server/package.json

## 8. Starta frontend

När frontend är implementerad är det planerade kommandot:

    npm run start:client

Frontendens egna scripts definieras i:

    client/package.json

## 9. Databas

Medicinsk journaldata ska lagras i SQL.

Planerade SQL-filer ligger i:

    database/

Den slutliga databastekniken, porten och installationsprocessen dokumenteras
när gruppen har låst databaslösningen.

Databasen ska minst hantera:

- användare
- patienter
- journalanteckningar
- relationer som krävs för behörighetskontroll

Blockchain ska inte användas för lagring av medicinsk journaltext.

## 10. Blockchain och P2P

Blockchain-delen utvecklas separat från journalens SQL-lagring.

Blockchain används för access logs och spårbarhet.

P2P-lagret ska göra det möjligt för minst två servernoder att dela relevant
blockchain-information.

## 11. Gemensamma kontrakt

Innan du ändrar API-format, roller eller integrationsflöden, kontrollera:

    docs/api-contract.md
    docs/roles-and-permissions.md
    docs/integration/README.md

Ändringar som påverkar flera delar av projektet ska kommuniceras till berörda
gruppmedlemmar.

## 12. Tester

Planerad gemensam testchecklista finns i:

    docs/integration/test-checklist.md

När implementationen är färdig ska projektet även testas från en ren clone.

## 13. Pull Request

När din uppgift är färdig:

    git status
    git add .
    git commit -m "Beskriv ändringen på svenska"
    git push -u origin din-branch

Skapa därefter en Pull Request till main.

Minst en annan gruppmedlem ska granska ändringarna innan merge.

## Status

Denna setup-guide beskriver projektets planerade gemensamma startflöde.

Kommandon och instruktioner ska uppdateras när den faktiska implementationen
finns på main.
