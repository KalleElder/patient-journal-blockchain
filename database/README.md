# Database

Här dokumenteras SQL-databasen för Patient Journal Blockchain.

## Huvudansvarig

Yamfu

## Syfte

SQL-databasen används för systemets vanliga data och framför allt
medicinska journaluppgifter.

Medicinsk journaltext ska lagras i SQL-databasen och aldrig i blockchain.

## Planerade filer

Databasmappen kommer senare att innehålla exempelvis:

    database/
    ├── schema.sql
    └── seed.sql

schema.sql ska innehålla SQL-kommandon för att skapa databasen och
tabellerna.

seed.sql kan användas för testdata under utvecklingen.

## Planerade tabeller

Databasen behöver minst hantera följande typer av information.

### users

Information om systemets användare.

Exempel på information:

- id
- namn
- användarnamn
- lösenordsinformation
- roll

### patients

Information om patienter.

Exempel på information:

- id
- namn
- patientinformation
- koppling till användare om patienten har ett eget konto

### journal_entries

Medicinska journalanteckningar.

Exempel på information:

- id
- patient_id
- author_id
- content
- visibility
- created_at

Den exakta strukturen bestäms när backend och databasen implementeras.

## Roller

Databasen ska kunna stödja projektets roller:

- Läkare
- Sjuksköterska / ambulanspersonal
- Vårdcentral
- Patient
- Obehörig

Backend ansvarar för att använda rollerna för authentication och
authorization.

## Journal visibility

Journalanteckningar planeras kunna ha olika synlighetsnivåer:

- PRIVATE
- STAFF
- ALL

Den slutliga behörighetsmodellen bestäms gemensamt innan implementationen
låses.

## Relationer

En journalanteckning ska kunna kopplas till:

- en patient
- användaren som skapade anteckningen

Backend ska använda dessa relationer när behörighet kontrolleras.

## Blockchain

Blockchain är separat från SQL-databasen.

SQL används för medicinsk data.

Blockchain används för audit/access logs.

Ett audit-event kan exempelvis innehålla:

- userId
- patientId
- role
- action
- timestamp

Audit-eventet ska inte innehålla journaltext.

## Säkerhet

Riktiga lösenord ska inte lagras i klartext.

Hemligheter och databasuppgifter ska inte hårdkodas i källkoden.

Lokala inställningar ska senare läggas i .env.

.env ska inte committas till Git.

## Status

SQL-databasen är ännu inte implementerad.

Yamfu skapar den faktiska databasstrukturen när backend-arbetet
påbörjas.

Den slutliga databasstrukturen dokumenteras här och i schema.sql.
