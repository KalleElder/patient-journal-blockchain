# API Contract

Detta dokument beskriver det gemensamma API-kontraktet mellan frontend,
backend och blockchain-delarna.

Syftet är att gruppmedlemmarna ska kunna utveckla sina delar parallellt
utan att använda olika namn eller dataformat.

API-kontraktet kan ändras senare om gruppen gemensamt kommer överens om det.

## Authentication

### POST /api/auth/login

Loggar in en användare.

Request:

    {
      "username": "doctor1",
      "password": "example"
    }

Planerad response:

    {
      "token": "...",
      "user": {
        "id": 1,
        "name": "Anna Andersson",
        "role": "DOCTOR"
      }
    }

## Patients

Kräver `Authorization: Bearer <token>` (se Authentication). Saknad eller
ogiltig token ger 401.

### GET /api/patients

Vårdpersonal (`DOCTOR`/`NURSE`/`CARE_CENTER`) får en lista patienter (200).
`PATIENT` nekas (403).

Response:

    [
      { "id": 1, "name": "Anna Andersson" }
    ]

### GET /api/patients/:id

Vårdpersonal får patienten (200) eller 404 om den saknas.

`PATIENT` får sin egen patient (200/404). Ett annat `:id` ger 403, oavsett
om patienten finns eller inte.

Exempel:

    GET /api/patients/1

## Journal

### GET /api/patients/:id/journal

Returnerar de journalanteckningar som den inloggade användaren har
behörighet att läsa. Samma behörighet som `GET /api/patients/:id`, plus:

Vårdpersonal ser poster med `visibility: "STAFF"` och `"ALL"`, samt egna
poster med `visibility: "PRIVATE"`. `PATIENT` ser endast `"ALL"`-poster
för sin egen patient.

Response:

    [
      {
        "id": 1,
        "patientId": 1,
        "authorId": 3,
        "authorName": "Dr Anna",
        "content": "Exempel på journalanteckning",
        "visibility": "ALL",
        "createdAt": "2026-09-10T19:30:00Z"
      }
    ]

### POST /api/patients/:id/journal

Skapar en ny journalanteckning. Endast vårdpersonal (403 för `PATIENT`).

Request:

    {
      "content": "Patienten mår bättre.",
      "visibility": "STAFF"
    }

`patientId` tas endast från URL:en, `authorId` endast från den
inloggade användaren (aldrig från body). Tomt/whitespace-`content` eller
ogiltig `visibility` ger 400. Okänd patient ger 404. Lyckad post ger 201
med samma format som en post i `GET .../journal`.

Visibility-värden:

- PRIVATE — endast skaparen (`authorId`) kan läsa anteckningen.
- STAFF — vårdpersonal kan läsa anteckningen, `PATIENT` kan inte.
- ALL — vårdpersonal och den anteckningen gäller (rätt `PATIENT`) kan läsa
  anteckningen.

## Access Logs

### GET /api/patients/:id/access-logs

Returnerar access logs för en patient om användaren har behörighet att
se dem.

Exempel på planerad response:

    [
      {
        "userId": 3,
        "userName": "Dr Anna",
        "patientId": 7,
        "role": "DOCTOR",
        "action": "READ_JOURNAL",
        "timestamp": "2026-09-10T19:32:00Z",
        "verified": true
      }
    ]

Fältet verified kan användas av frontend för att visa om en blockchain-logg
har verifierats.

## Audit Event

Backend och blockchain ska använda ett gemensamt format för audit events.

Planerat format:

    {
      "userId": 3,
      "patientId": 7,
      "role": "DOCTOR",
      "action": "READ_JOURNAL",
      "timestamp": "2026-09-10T19:32:00Z"
    }

Medicinsk journaltext får INTE inkluderas i ett audit event.

Exempel på planerade actions:

- READ_JOURNAL
- CREATE_JOURNAL_ENTRY
- UPDATE_JOURNAL_ENTRY
- ACCESS_DENIED

Det slutliga gränssnittet mellan Yamfus backend och Tims blockchain
bestäms tillsammans innan integrationen låses.

## Socket Events

Planerade Socket.io-events:

- journal:updated
- audit:new
- activity:started
- activity:stopped
- blockchain:synced

Exempel på live activity:

    {
      "userId": 3,
      "name": "Dr Anna",
      "role": "DOCTOR",
      "patientId": 7,
      "action": "READING"
    }

Audit- och activity-events ska inte innehålla medicinsk journaltext.

Journaldata som behöver skickas mellan servrar hanteras separat från
blockchainens audit logs.

## Gemensamma regler

- Medicinsk journaldata lagras i SQL.
- Medicinsk journaltext lagras aldrig i blockchain.
- Backend ansvarar för authentication och authorization.
- Frontend får inte vara den enda behörighetskontrollen.
- Access till journaler ska kunna skapa audit events.
- API-format som används av flera gruppmedlemmar ska dokumenteras här.
- Större ändringar i kontraktet diskuteras med berörda gruppmedlemmar.

## Status

Version: 0.1

Detta är projektets första API-kontrakt och kan uppdateras när
implementationen påbörjas.
