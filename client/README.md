# Client

Frontend-delen av Patient Journal Blockchain.

## Huvudansvarig

Josef

## Ansvarsområde

Frontend ska bland annat innehålla:

- Login
- Patientsökning
- Patientvy
- Journalvy
- Formulär för att skapa journalanteckningar
- Val av synlighet för journalanteckningar
- Access denied-vy
- Access logs
- Socket.io-client
- Liveuppdateringar
- Realtidsaktivitet
- Verification badge för blockchain-loggar

## Kommunikation med backend

Frontend ska kommunicera med backend via projektets API.

Det gemensamma API-kontraktet finns i:

docs/api-contract.md

Frontend ska inte ansluta direkt till SQL-databasen.

## Behörighet

Frontend kan visa eller dölja funktioner beroende på användarens roll,
men frontend får aldrig vara den enda säkerhetskontrollen.

Backend ansvarar alltid för den faktiska kontrollen av användarens
behörighet.

## Journaldata

Medicinska journaluppgifter hämtas från backend och lagras i SQL-databasen.

Journaltext ska aldrig lagras direkt i blockchain.

## Realtidsuppdateringar

Frontend ska senare kunna använda Socket.io för att ta emot
realtidsuppdateringar.

Exempel på information som kan visas:

- ny journalanteckning
- uppdaterad journal
- aktuell aktivitet
- nya access logs
- blockchain-verifieringsstatus

## Status

Frontend är ännu inte implementerad.

Frontend-ramverk och den slutliga komponentstrukturen bestäms innan
Josef påbörjar implementationen.
