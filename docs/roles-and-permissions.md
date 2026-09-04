# Roller och behörigheter

Detta dokument beskriver projektets gemensamma plan för roller och behörigheter.

Backend är alltid ansvarig för den slutliga behörighetskontrollen.

Frontend får dölja eller visa funktioner beroende på roll, men frontend får
aldrig vara den enda säkerhetskontrollen.

## Roller

Systemet ska stödja följande fem användartyper:

- DOCTOR
- NURSE
- CARE_CENTER
- PATIENT
- UNAUTHORIZED

## DOCTOR

Läkare är vårdpersonal med behörighet att arbeta med patientjournaler.

Planerade rättigheter:

- logga in
- söka efter patienter
- öppna patient
- läsa journalanteckningar som rollen har behörighet till
- skapa journalanteckningar
- välja tillåten visibility för nya anteckningar
- skapa access logs genom journalåtkomst

## NURSE

NURSE representerar sjuksköterska eller ambulanspersonal.

Planerade rättigheter:

- logga in
- söka efter patienter
- öppna patient
- läsa journalanteckningar som rollen har behörighet till
- skapa journalanteckningar om projektets slutliga regler tillåter det
- skapa access logs genom journalåtkomst

## CARE_CENTER

CARE_CENTER representerar behörig användare eller funktion på vårdcentral.

Planerade rättigheter:

- logga in
- söka efter patienter
- öppna patient
- läsa journalinformation som rollen har behörighet till
- utföra de journaloperationer som den slutliga implementationen tillåter
- skapa access logs genom journalåtkomst

CARE_CENTER ska inte automatiskt ges större behörighet än vad som behövs.

## PATIENT

Patienten ska endast kunna komma åt information som tillhör den egna
patientidentiteten.

Planerade rättigheter:

- logga in
- öppna sin egen patientvy
- läsa journalanteckningar som är synliga för patienten
- inte söka fram och läsa andra patienters journaler

Backend måste kontrollera att den inloggade användaren är kopplad till den
patient som efterfrågas.

Det räcker inte att frontend döljer andra patient-ID:n.

Exempel:

Om användare 12 är kopplad till patient 7 får följande request endast lyckas
om backend verifierar kopplingen:

    GET /api/patients/7/journal

Om samma användare försöker:

    GET /api/patients/8/journal

ska backend neka åtkomst.

## UNAUTHORIZED

Obehörig användare ska inte få åtkomst till skyddad patient- eller
journalinformation.

Planerat beteende:

- ingen journalåtkomst
- ingen patientsökning
- ingen möjlighet att skapa journalanteckning
- skyddade API-routes returnerar ett lämpligt fel

## Visibility

Projektet planerar följande visibility-nivåer:

### PRIVATE

Anteckningen är endast tillgänglig enligt projektets mest begränsade
behörighetsregel.

Planerad grundregel:

- skaparen kan läsa anteckningen
- övriga användare nekas

Den exakta regeln ska verifieras av gruppen innan implementationen låses.

### STAFF

Anteckningen är avsedd för behörig vårdpersonal.

Planerad grundregel:

- DOCTOR kan läsa
- NURSE kan läsa
- CARE_CENTER kan läsa om den slutliga behörighetsmodellen tillåter det
- PATIENT kan inte läsa
- UNAUTHORIZED kan inte läsa

### ALL

Anteckningen kan visas för behörig vårdpersonal och patienten själv.

Planerad grundregel:

- DOCTOR kan läsa
- NURSE kan läsa
- CARE_CENTER kan läsa enligt slutlig behörighetsmodell
- rätt PATIENT kan läsa
- andra patienter kan inte läsa
- UNAUTHORIZED kan inte läsa

## Behörighetsmatris

| Funktion | DOCTOR | NURSE | CARE_CENTER | PATIENT | UNAUTHORIZED |
|---|---|---|---|---|---|
| Logga in | Ja | Ja | Ja | Ja | Nej |
| Söka patienter | Ja | Ja | Ja | Nej | Nej |
| Öppna patient | Ja | Ja | Ja | Endast sig själv | Nej |
| Läsa journal | Enligt visibility | Enligt visibility | Enligt visibility | Egen + tillåten visibility | Nej |
| Skapa anteckning | Ja | Enligt slutlig regel | Enligt slutlig regel | Nej | Nej |
| Se access logs | Enligt slutlig regel | Enligt slutlig regel | Enligt slutlig regel | Enligt slutlig regel | Nej |

## Backend-regler

Backend ska kontrollera authentication innan skyddade resurser returneras.

Backend ska därefter kontrollera authorization.

Förenklat flöde:

    Request
      |
      v
    Authentication
      |
      v
    Identifiera user + role
      |
      v
    Authorization
      |
      v
    Kontrollera patient + visibility
      |
      v
    Tillåt eller neka request

## URL-manipulation

Backend får aldrig anta att ett patient-ID är tillåtet bara för att det kommer
från frontend.

Exempel:

    /patients/7

kan manuellt ändras till:

    /patients/8

Backend måste därför kontrollera behörigheten för varje request.

## Audit logging

När en relevant journaloperation genomförs ska backend skapa ett audit-event.

Exempel på actions:

    READ_JOURNAL
    CREATE_JOURNAL_ENTRY
    READ_ACCESS_LOG

Audit-eventet kan innehålla:

    userId
    patientId
    role
    action
    timestamp

Audit-eventet får inte innehålla medicinsk journaltext.

## Gemensam regel för frontend och backend

Josefs frontend använder rollerna för att bestämma vilka vyer och knappar som
ska visas.

Yamfus backend använder rollerna för att faktiskt tillåta eller neka
operationen.

Om frontend och backend inte är överens är det backend som ska neka
operationen.

## Innan implementationen låses

Gruppen ska gemensamt bekräfta:

- exakt vad CARE_CENTER får göra
- om NURSE får skapa journalanteckningar
- om CARE_CENTER får skapa journalanteckningar
- exakt definition av PRIVATE
- vilka roller som får se access logs

När gruppen har beslutat detta ska dokumentet uppdateras så att de preliminära
formuleringarna ersätts av de faktiska regler som används i systemet.
