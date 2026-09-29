# Client

Frontend-delen av Patient Journal Blockchain. Byggd med React och Vite.

## Huvudansvarig

Josef

## Köra

Från projektroten:

    npm run install:all
    npm run start:client

Eller direkt i client/:

    npm install
    npm run dev

Frontend startar på http://localhost:5173.

Backend måste köra samtidigt (`npm run start:server`, port 3001).

## Backend-URL

Frontend anropar alltid relativa sökvägar som `/api/auth/login`. Vites
dev-server skickar vidare allt under `/api` till backend, se `vite.config.js`.
Därför behövs ingen CORS-inställning i backend under utveckling. Socket.io
för liveaktiviteten går samma väg (`/socket.io`, även websockets).

Vilken backend som används styrs av `VITE_API_URL` (default
`http://localhost:3001`). Kopiera `.env.example` till `.env` om du vill ändra.

## Login

1. Användaren fyller i användarnamn och lösenord.
2. Frontend skickar `POST /api/auth/login`.
3. Vid 200 sparas token och användare, och startsidan visas.
4. Vid 401 visas "Felaktiga inloggningsuppgifter."
5. Om backend inte svarar visas "Kunde inte nå servern."

Rollen kommer alltid från backend. Frontend bestämmer aldrig rollen själv.

## JWT i utvecklingsversionen

Token och användarobjektet sparas i `localStorage` (nycklarna `token` och
`user`). Alla anrop går genom `src/services/api.js`, som lägger till
`Authorization: Bearer <token>` när en token finns.

Vid refresh av sidan kollar frontend token mot `GET /api/auth/me`. Svarar
backend 200 är användaren fortfarande inloggad, annars rensas sessionen och
login-sidan visas. Utloggning tar bort token och användare från `localStorage`.

Det här är en enkel lösning för utvecklingsversionen. `localStorage` är inte
det säkraste stället för en token, men det räcker för projektet just nu.

## Roller

Frontend känner till exakt de roller backend använder, se `src/roles.js`:

- DOCTOR
- NURSE
- CARE_CENTER
- PATIENT
- UNAUTHORIZED

DOCTOR, NURSE och CARE_CENTER räknas som vårdpersonal och får patientlistan.
PATIENT landar direkt i sin egen journal. Alla andra roller får "Åtkomst nekad".

Frontend visar eller döljer bara vyer. Backend gör den riktiga
behörighetskontrollen.

## Patienter och journal

Följer `docs/api-contract.md`.

1. Vårdpersonal ser patientlistan (`GET /api/patients`) och kan filtrera på
   namn. Klick på en patient öppnar journalen.
2. Journalvyn hämtar `GET /api/patients/:id/journal`. Backend har redan
   filtrerat på behörighet och synlighet, så frontend visar listan som den
   kommer: författare, synlighetstagg (Privat / Vårdpersonal / Alla),
   tidpunkt och text.
3. Vårdpersonal kan skapa en ny anteckning med `POST /api/patients/:id/journal`
   (text + synlighet). När backend svarar 201 hämtas journalen om.
4. En patient ser bara sin egen journal och bara `ALL`-anteckningar. Patienten
   får ingen patientlista och inget formulär.

Felsvar från backend visas som text: 403 ("Du har inte behörighet..."),
404 ("Patienten hittades inte.") och 400 vid ogiltig anteckning.

## Åtkomstlogg

Journalvyn har två flikar: **Journal** och **Åtkomstlogg**.

Åtkomstloggen hämtas från `GET /api/patients/:id/access-logs`, som läser
blockkedjans audit-block. Varje rad visar vad som hände (Läste journalen,
Skrev en anteckning, Nekad åtkomst), rollen, användar-ID och tidpunkt,
nyast först. Nekade försök markeras med rött.

Vårdpersonal ser loggen för den patient de har öppnat. En patient ser bara
sin egen logg. Försöker en patient läsa en annan patients logg svarar backend
403 och frontend visar "Du har inte behörighet att se åtkomstloggen."

Loggen innehåller bara metadata. Journaltext finns aldrig i blockkedjan och
visas därför aldrig här.

## Liveaktivitet

Vårdpersonal ser en panel "Live" bredvid patientlistan och journalen (under
innehållet på smal skärm). När noden skapar ett audit-block skickar den
`NEW_BLOCK` över Socket.io till alla anslutna, och panelen visar händelsen
direkt med blocknummer, roll, användar-ID, patient-ID och tid. Frontend
lyssnar bara och skickar aldrig något över socketen.

Panelen visar händelser från den nod frontend är ansluten till. Block som
skapas på den andra noden synkas över P2P och syns i åtkomstloggen på båda
noderna, men noden skickar bara `NEW_BLOCK` till webbläsare för block den
själv har skapat.

Patienter får ingen livepanel, eftersom den visar händelser för alla patienter.

## Två noder lokalt

Starta Node 1 och Node 2 enligt rot-README:n. Frontend för Node 2 startas i
en egen terminal med en annan backend-URL och port:

    VITE_API_URL=http://localhost:3002 npm run dev -- --port 5174

## Struktur

    client/
    ├── index.html
    ├── vite.config.js              proxy /api och /socket.io -> backend
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx                 login eller startsida beroende på session
        ├── roles.js                rollerna från backend
        ├── index.css
        ├── services/api.js         alla anrop mot backend + tokenhantering
        ├── pages/LoginPage.jsx
        ├── pages/HomePage.jsx      rollbaserad startsida
        ├── pages/PatientListPage.jsx  patientlista med sökfilter (vårdpersonal)
        ├── pages/JournalPage.jsx   journalvy med flikarna Journal och Åtkomstlogg
        └── components/
            ├── UserBar.jsx
            ├── JournalEntry.jsx    en anteckning med synlighetstagg
            ├── NewEntryForm.jsx    formulär för ny anteckning (vårdpersonal)
            ├── AccessLog.jsx       åtkomstloggen för en patient
            ├── AuditEvent.jsx      en händelse ur auditloggen
            └── LiveActivity.jsx    livepanel via Socket.io (vårdpersonal)

## Testat

Testat i webbläsare mot backend på main:

- frontend startar och login-sidan visas
- `doctor1` + rätt lösenord loggar in och visar "Roll: DOCTOR"
- fel lösenord ger "Felaktiga inloggningsuppgifter."
- `patient1` loggar in, visar "Roll: PATIENT" och sitt patient-ID
- refresh behåller inloggningen via `GET /api/auth/me`
- logga ut rensar sessionen och visar login-sidan
- `npm run install:all` från projektroten installerar både server och client
- `doctor1` ser patientlistan och kan filtrera på namn
- klick på patient öppnar journalen med rätt patient-ID
- ny anteckning med synlighet STAFF respektive ALL sparas och visas direkt
- tom anteckning stoppas i frontend
- "← Alla patienter" går tillbaka till listan
- `patient1` landar i "Min journal", ser bara `ALL`-anteckningar, ingen
  patientlista och inget formulär
- `nurse1` och `carecenter1` ser patientlistan
- `doctor1` ser åtkomstloggen för patienten, nyast först, utan journaltext
- `carecenter1` ser åtkomstloggen
- `patient1` ser sin egen åtkomstlogg men ingen livepanel
- `patient1` som ändrar sitt patient-ID i `localStorage` nekas både journal
  och åtkomstlogg (403 från backend, felmeddelande i frontend)
- med två webbläsare på samma nod: när `doctor1` läser eller skriver i
  journalen dyker händelsen upp live hos `nurse1`, även "Nekad åtkomst"
- åtkomstloggen på Node 2 innehåller händelserna som skapades via Node 1
- livepanelen hamnar under innehållet på mobilbredd, utan horisontell scroll
- `npm run lint` och `npm run build` går igenom

## Implementerat

- React + Vite i client/
- login-sida
- gemensam API-service
- JWT-hantering
- visning av namn och roll
- logout
- rollbaserad startsida
- patientlista med sökfilter
- journalvy med synlighetstaggar
- skapa journalanteckning
- åtkomstlogg per patient
- liveaktivitet via Socket.io

## Inte implementerat ännu

- verification badge: väntar på Verification API från backend
  (gruppkontraktet: Tim, Yamfu och Josef kommer överens om hur verifiering
  visas)
