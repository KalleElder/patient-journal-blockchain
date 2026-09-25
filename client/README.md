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
Därför behövs ingen CORS-inställning i backend under utveckling.

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

## Struktur

    client/
    ├── index.html
    ├── vite.config.js              proxy /api -> backend
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
        ├── pages/JournalPage.jsx   journalvy för en patient
        └── components/
            ├── UserBar.jsx
            ├── JournalEntry.jsx    en anteckning med synlighetstagg
            └── NewEntryForm.jsx    formulär för ny anteckning (vårdpersonal)

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

## Inte implementerat ännu

- åtkomstlogg i journalvyn (endpointen finns sedan #15)
- blockchain verification
- Socket.io / liveuppdateringar
