# Sesiuni tematice (Claude Code)

O sesiune Claude Code coordonează o etapă (planul, autorizarea, implementarea, verificarea). O sesiune tematică tratează în detaliu o componentă sau o întrebare. Sesiunile nu își văd reciproc istoria; legătura dintre ele sunt documentele din `info_pack/docs/` (vezi secțiunea „Sesiuni” din `CLAUDE.md`). Până la 23.11.2026, același rol îl aveau discuțiile din proiectul claude.ai (D44).

Practic, în VS Code: o sesiune nouă pentru fiecare temă sau etapă (istoricul vechi nu se încarcă automat); la un moment dat, o singură sesiune modifică fișiere.

## Șablon de pornire

Copiază textul de mai jos ca prim mesaj al sesiunii și completează câmpurile dintre `< >`.

```text
Sesiune tematică (RoomAllocation): <tema>. Răspunde în română.

Citește CLAUDE.md și info_pack/docs/docs-guide.md, apoi nivelul 1 de citire (handoff.md, decisions.md, primele intrări din journal.md). Pentru detalii, consultă: <documente / secțiuni, de ex. concept.md §5>.

Tema și limitele: <ce intră; ce nu intră>.
Permisiuni: <doar întrebări și explicații, fără modificarea fișierelor | poate modifica: <fișiere/foldere>; poate rula: <comenzi, de ex. npm test>>.

Reguli:
- Lucrează doar în tema dată. O decizie din afara temei sau o contradicție cu decisions.md se semnalează; nu o schimba.
- Nu implementa nimic fără autorizarea mea explicită.
- Deciziile noi se trec în decisions.md, iar progresul în journal.md și handoff.md, înainte de încheierea sesiunii (dacă sesiunea are permisiunea de a modifica fișiere).
- La încheiere, oferă un rezumat de 3–5 rânduri: ce s-a decis, ce s-a realizat, ce rămâne, impactul asupra planului.

Primul pas: <întrebarea sau sarcina inițială>.
```

## Exemplu: mutări și interschimbări

```text
Sesiune tematică (RoomAllocation): mutări și interschimbări de rezervări. Răspunde în română.

Citește CLAUDE.md și info_pack/docs/docs-guide.md, apoi nivelul 1 de citire. Pentru detalii, consultă concept.md §5.3 și cazurile 1, 2, 3 și 5 din §6, plus results.md §3.

Tema și limitele: când sunt utile mutările, ce rezervări pot fi mutate, limitele (număr, adâncime, orizont înghețat), cum se măsoară valoarea lor. Nu intră: interfața, baza de date.
Permisiuni: doar întrebări și explicații, fără modificarea fișierelor; poate rula npm test și npm run simulate.

Reguli:
- Lucrează doar în tema dată. O decizie din afara temei sau o contradicție cu decisions.md se semnalează; nu o schimba.
- Nu implementa nimic fără autorizarea mea explicită.
- La încheiere, oferă un rezumat de 3–5 rânduri: ce s-a decis, ce s-a realizat, ce rămâne, impactul asupra planului.

Primul pas: analizează propunerea P04 și dă-mi 3 contraexemple în care o mutare ar face mai mult rău decât bine.
```

## Prima sesiune după mutarea în Claude Code

```text
Prima sesiune Claude Code pentru RoomAllocation. Răspunde în română.

Citește CLAUDE.md, apoi nivelul 1 din info_pack/docs/docs-guide.md. Nu modifica niciun fișier.
1. Rezumă în 10–15 rânduri starea proiectului: ce e încheiat, ce așteaptă, punctele deschise.
2. Verifică mediul: node --version, docker --version, git status.
3. Rulează npm test și npm run typecheck; dacă Docker rulează: npm run db:up, npm run test:db.
4. Raportează rezultatele și orice nepotrivire între documente și cod.
```
