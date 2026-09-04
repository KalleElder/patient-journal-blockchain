# Git Workflow

Detta dokument beskriver gruppens gemensamma Git-arbetsflöde.

Målet är att alla ändringar ska vara spårbara och granskas innan de hamnar i
main.

## Viktig regel

Ingen arbetar direkt på main.

main ska innehålla den senaste granskade och fungerande versionen av projektet.

## Innan du börjar en ny uppgift

Gå alltid tillbaka till main och hämta senaste versionen:

    git checkout main
    git pull origin main

Skapa sedan en ny branch för uppgiften.

Exempel:

    git checkout -b feature/auth

## Branch-namn

Branches ska beskriva vad som utvecklas.

Exempel:

    feature/auth
    feature/patient-api
    feature/journal-api
    feature/blockchain
    feature/p2p
    feature/frontend
    feature/patient-journal
    feature/access-logs
    feature/project-integration

För buggrättningar kan vi använda:

    fix/namn-pa-bugg

För projektstruktur kan vi använda:

    setup/namn-pa-setup

## Under arbetet

Kontrollera vilka filer som har ändrats:

    git status

Lägg till ändringarna:

    git add .

Gör en commit med ett tydligt meddelande på svenska.

Exempel:

    git commit -m "Lägg till grundläggande autentisering"

Push sedan branchen:

    git push -u origin branch-namn

Exempel:

    git push -u origin feature/auth

## Pull Request

När en funktion är redo ska en Pull Request skapas från feature-branchen till
main.

Exempel:

    feature/auth -> main

Pull Requesten ska beskriva:

- vad som har implementerats
- vilka filer eller delar som påverkas
- hur funktionen har testats
- om andra gruppmedlemmars kod påverkas
- om något återstår

## Code Review

Minst en annan gruppmedlem ska granska Pull Requesten innan merge.

Den som granskar ska bland annat kontrollera:

- fungerar implementationen?
- är koden begriplig?
- finns uppenbara buggar?
- följer lösningen API-kontraktet?
- påverkas andra moduler?
- finns känsliga uppgifter i koden?
- hamnar medicinsk journaltext av misstag i blockchain?

## Merge

När Pull Requesten är godkänd kan den mergas till main.

Efter merge ska utvecklaren uppdatera sin lokala main:

    git checkout main
    git pull origin main

Den gamla lokala branchen kan därefter tas bort:

    git branch -d branch-namn

Om remote-branchen inte automatiskt togs bort efter merge kan den tas bort med:

    git push origin --delete branch-namn

## Om main har ändrats medan du arbetar

Om andra Pull Requests har mergats medan du arbetar ska du uppdatera din branch
innan din egen Pull Request mergas.

Börja med:

    git checkout main
    git pull origin main

Gå sedan tillbaka till din branch:

    git checkout din-branch

Hämta in senaste main:

    git merge main

Lös eventuella merge conflicts på din egen branch.

Pusha sedan den uppdaterade branchen igen.

## Merge conflicts

Om Git visar en merge conflict ska vi inte gissa eller radera kod utan att
förstå konflikten.

Om konflikten påverkar en annan gruppmedlems modul kontaktar vi den personen
innan konflikten löses.

Efter att konflikten har lösts:

    git add .
    git commit -m "Lös merge conflict"
    git push

## Commits

Commit-meddelanden ska vara korta och beskriva vad som faktiskt ändrats.

Bra exempel:

    Lägg till login och autentisering

    Lägg till SQL-schema för journaldata

    Lägg till blockchain-validering

    Lägg till patientvy i frontend

    Dokumentera integrationsflödet

Undvik otydliga meddelanden som:

    fix

    stuff

    test

    update

## Ansvar

Varje gruppmedlem ansvarar för att:

- skapa sin egen branch
- inte utveckla direkt på main
- göra begripliga commits
- pusha sitt arbete
- skapa Pull Request
- be om code review
- hantera feedback innan merge

## Grundregel

Arbetsflödet är:

    main
      |
      v
    feature branch
      |
      v
    utveckling
      |
      v
    commit
      |
      v
    push
      |
      v
    Pull Request
      |
      v
    Code Review
      |
      v
    Merge till main
