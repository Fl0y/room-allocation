---
name: rezultate
description: Rulează experimentele RoomAllocation (simularea, săptămâna sintetică, cererea cu interval) și pregătește actualizarea results.md cu sursa (comanda, seed-urile, commit-ul). Folosește-l când autorul cere rezultate, cifre noi sau reproducerea unei secțiuni din results.md.
argument-hint: "<simulate | week | interval | secțiunea din results.md>"
---

# /rezultate — experimentele și results.md

Cerere: $ARGUMENTS

1. Citește secțiunea corespunzătoare din `info_pack/docs/results.md`: ce comandă, ce seed-uri și ce parametri au produs cifrele existente. Folosește exact aceiași parametri, dacă autorul nu cere altfel.
2. Arbore curat: `git status --short` fără modificări în `src/` (altfel cifrele nu corespund niciunui commit). Notează `git rev-parse --short HEAD`.
3. Rulează comanda (`npm run simulate`, `npm run week -- synthetic`, `npm run interval -- synthetic`). Rezultatele pe datele **reale** rămân în `../room-allocation-data/real/` și nu intră în Git, în `results.md` sau în mesaje decât ca cifre agregate, fără date personale (D33, D34).
4. Compară cu cifrele existente. O diferență fără o schimbare de cod explicabilă e o problemă de raportat, nu de „corectat”.
5. Propune textul pentru `results.md`: secțiunea înlocuită (nu adăugată în paralel), cu sursa (comanda, seed-urile, commit-ul, data) și eticheta *preliminar* / *verificat*. Nicio cifră care nu provine din rularea de acum.
6. Interpretarea: doar ce susțin cifrele; fără afirmații de noutate sau superioritate fără comparație măsurată (CLAUDE.md).
7. Modificarea efectivă a `results.md` se face pe ramura sarcinii (D47), după acordul autorului.
