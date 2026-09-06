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

DOCTOR, NURSE och CARE_CENTER räknas som vårdpersonal och får startsidan för
patientsökning. PATIENT får en egen startsida med sitt patient-ID. Alla andra
roller får "Åtkomst nekad".

Frontend visar eller döljer bara vyer. Backend gör den riktiga
behörighetskontrollen.

## Struktur

    client/
    ├── index.html
    ├── vite.config.js          proxy /api -> backend
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx             login eller startsida beroende på session
        ├── roles.js            rollerna från backend
        ├── index.css
        ├── services/api.js     alla anrop mot backend + tokenhantering
        ├── pages/LoginPage.jsx
        ├── pages/HomePage.jsx  rollbaserad startsida
        └── components/UserBar.jsx

## Testat

Manuellt testat mot Yamfus backend (main):

- frontend startar och login-sidan visas
- `doctor1` + rätt lösenord loggar in och visar "Roll: DOCTOR"
- fel lösenord ger "Felaktiga inloggningsuppgifter."
- `patient1` loggar in, visar "Roll: PATIENT" och patient-ID 7
- refresh behåller inloggningen via `GET /api/auth/me`
- logga ut rensar sessionen och visar login-sidan
- `npm run install:all` från projektroten installerar både server och client
- `npm run build` bygger utan fel

## Implementerat

- React + Vite i client/
- login-sida
- gemensam API-service
- JWT-hantering
- visning av namn och roll
- logout
- rollbaserad startsida

## Inte implementerat ännu

- patientsökning
- journalvy
- skapa journalanteckning
- access logs
- Socket.io
- blockchain verification
