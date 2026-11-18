# Starea curentă — RoomAllocation

**Actualizat:** 18 noiembrie 2026 (noaptea). Fișierul descrie doar starea de acum; se rescrie la fiecare etapă încheiată. Istoricul este în `journal.md`, ordinea de citire în `docs-guide.md`.

## Ce există

- **V0 încheiat** (motorul, cazurile 1–5, simularea, demo-ul static pe GitHub Pages) și **Lotul 3A încheiat** (formatul intern al datelor, setul sintetic, săptămâna în simulator; commit `a813fcb`, verificat pe Mac).
- **Lotul 4, autorizat și implementat (18.11.2026); 4a și 4c verificate pe Mac de autor:**
  - 4a: cererea cu interval (`latest` în `Request`); motorul încearcă fiecare început și alege după D31 (mutări → săli rare → ferestrele studenților → locuri goale → goluri în programul sălii → perechea cea mai devreme); explicația arată intervalul și ferestrele; termenii aliniați („goluri izolate” pentru săli, „ferestre” pentru studenți). Fără interval, deciziile sunt identice cu V0.
  - 4b: oracolul exhaustiv extins la intervale, validare, determinism, teste de mutație (`tests/engine/interval.test.ts`); cazurile 6–10, aprobate de autor, ca scenarii (`src/scenarios/cases.ts`, vizibile în raportul cazurilor și în demo) și teste.
  - 4c: `npm run interval -- synthetic`; rezultatele preliminare în `results.md` §5.
- **Verificat în mediul lui Claude:** 103 teste trec; `tsc` fără erori; demo-ul și raportul cazurilor se construiesc.
- **Decizii:** D01–D35; nicio întrebare deschisă.
- **Nu există:** date reale, bază de date, API, dashboard sau panou reale, Docker.

## Așteaptă autorul

1. `npm test` pe Mac (103 teste, cu cazurile 6–10); apoi bifa 4b și commit-ul. Cu asta, Lotul 4 este încheiat.

## Pasul următor

- După Lotul 4: **Lotul 5** (back-end: PostgreSQL, Docker, concurența, D35) — necesită autorizare; sau 3B, dacă vin datele reale.

## Puncte deschise (neblocante)

- Propuneri neconfirmate ale Lotului 4: la egalitate se alege perechea cea mai devreme; criteriul ferestrelor se aplică doar strategiei scor (first-fit și best-fit rămân referințe); distribuția intervalelor în simulare.
- Valorile setului sintetic și ale cererilor suplimentare (`data-format.md` §4–5) sunt propuneri; se recalibrează cu datele reale.
- Concept §4.2 (H7 face problema dificilă) trebuie reformulat prudent (`literature.md` §2).
- Demo-ul static nu are încă câmp pentru interval (interfețele: Lotul 6).
