# Tallknuser

Hvis GitHub viser **"This branch cannot be rebased due to conflicts"**, betyr det at branchen din og `main` har endret samme linjer.

## Løsning (anbefalt)

1. Åpne PR-en din på GitHub.
2. Trykk **Resolve conflicts** (hvis knappen vises).
3. For hver konfliktblokk:
   - behold ønsket kode,
   - fjern `<<<<<<<`, `=======`, `>>>>>>>`.
4. Trykk **Mark as resolved** og deretter **Commit merge**.
5. Gå tilbake til PR og fullfør merge.

## Hvis `Resolve conflicts` ikke vises

Da må konflikten løses lokalt:

```bash
git checkout <din-branch>
git fetch origin
git merge origin/main
# løs konfliktene i filene
git add .
git commit -m "Resolve merge conflicts with main"
git push origin <din-branch>
```

Når push er ferdig, oppdater PR-siden. Konfliktvarslet skal være borte.
