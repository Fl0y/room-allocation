# Starea curentă — RoomAllocation

**Actualizat:** 18 noiembrie 2026 (seara). Fișierul descrie doar starea de acum; se rescrie la fiecare etapă încheiată. Istoricul este în `journal.md`, ordinea de citire în `docs-guide.md`.

## Ce există

- **V0 încheiat și acceptat de coordonator:** motorul (`src/engine/`), cazurile 1–5, generatorul și simulatorul V0, demo-ul static (pe GitHub Pages, D35).
- **Lotul 3A (nou, 18.11.2026), autorizat și implementat:** formatul intern al datelor (`src/data/`, specificația `data-format.md`), exemplul mic fictiv pentru teste (`tests/fixtures/mini/`), setul sintetic al facultății (`src/sim/faculty.ts`, `npm run data:synthetic`), raportul de validare (`npm run data:check`), săptămâna în simulator cu măsurătorile de bază (`src/sim/week.ts`, `src/sim/metrics.ts`, `npm run week`). Datele și rapoartele lor stau în `room-allocation-data/`, în afara Git (D33).
- **Verificat în mediul lui Claude:** 90 de teste trec (63 vechi + 27 noi); `tsc` fără erori; simularea V0 dă aceleași rezultate ca înainte (comparată rulare cu rulare). Rezultatele preliminare: `results.md` §4.
- **Decizii:** D01–D35; nicio întrebare deschisă. Repository-ul este public (D34); sistemul complet V1 va rula local, prin Docker (D35).
- **Nu există:** date reale, bază de date, API, dashboard sau panou reale, Docker.

## De verificat pe Mac (autorul)

```bash
npm test                          # 90 de teste
npm run data:synthetic            # scrie în ../room-allocation-data/synthetic/canonical/
npm run data:check -- synthetic   # 0 erori, 0 avertismente
npm run week -- synthetic         # ≈ 15 s; raportul în synthetic/reports/week.html
```

După verificare: bifele 3a.1–3a.3 în `plan.md` și commit-ul.

## Pasul următor

1. Verificarea pe Mac și commit-ul Lotului 3A.
2. **Datele reale** (D32): când vin, partea 3B (convertorul după formatul primit, pseudonimizarea, comparația cu setul sintetic).
3. Dacă datele întârzie: **Lotul 4** (cererea cu interval și ferestrele studenților) poate porni pe setul sintetic — necesită autorizare.

## Puncte deschise (neblocante)

- Valorile setului sintetic și ale cererilor suplimentare (`data-format.md` §4–5) sunt propuneri; se recalibrează cu datele reale. Orarul generat este foarte compact (4% zile cu ferestre).
- Concept §4.2 (H7 face problema dificilă) trebuie reformulat prudent (`literature.md` §2).
- Codul V0 folosește încă „ferestre izolate” pentru golurile din programul sălilor; se aliniază cu `glossary.md` în Lotul 4.
