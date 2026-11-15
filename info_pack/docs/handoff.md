# Starea curentă — RoomAllocation

**Actualizat:** 15 noiembrie 2026. Fișierul descrie doar starea de acum; se rescrie la fiecare etapă încheiată. Istoricul este în `journal.md`, ordinea de citire în `docs-guide.md`.

## Ce există

- **V0 încheiat și prezentat coordonatorului** (proiect acceptat): motorul de alocare (`src/engine/`), cazurile 1–5 (`src/scenarios/`), generatorul și simulatorul (`src/sim/`), demo-ul static (`src/demo/`). Teste: 63 trec în mediul lui Claude (59 verificate și pe Mac; testul hărții, adăugat la 15.11, de rulat pe Mac). Rezultate: `results.md`.
- **Documente de orientare:** `glossary.md` (termenii), `project-map.md` (rolul fișierelor, ordinea de citire a codului; verificată automat de `tests/docs/project-map.test.ts`).
- **Analiza literaturii, versiunea 1:** `literature.md`.
- **Decizii:** D01–D29, propunerile confirmate P01–P17; **nicio întrebare deschisă** (`decisions.md`).
- **Nu există:** bază de date, API, dashboard sau panou reale, Docker, importul datelor reale.

## Direcția stabilită pentru versiunea următoare

- **D28 — date reale:** structura universității (săli, echipamente, grupe și mărimi, profesori și repartizarea lor) și orarul real ca rezervări existente; profesori cu nume fictive; cereri suplimentare sintetice; ITC 2019 pentru validare. Datele originale cu nume reale nu intră în Git.
- **D29 — ferestrele studenților:** cererea cu interval de perechi (P11); motorul alege și perechea, reducând ferestrele subgrupelor; prioritate mai mică decât mutările și protejarea sălilor rare; varianta online întâi, planificarea semestrului mai târziu.

## Pasul următor

1. **Propunerea planului V1** (`plan.md` versiunea 2): ordinea etapelor (importul datelor reale, indicatorul ferestrelor, cererea cu interval, back-end-ul cu bază de date și concurență, interfețele), criteriile de acceptare ale primului lot. Necesită aprobarea autorului.
2. Fără autorizare, nu se începe implementarea.

## Puncte deschise (neblocante)

- Alegerile generatorului de date (fără conflicte de persoane, ponderile tipurilor, toate rezervările mutabile) — propuneri neconfirmate; de revăzut odată cu datele reale.
- Concept §4.2 (H7 face problema dificilă) trebuie reformulat prudent (`literature.md` §2).
- Locul ferestrelor față de excedent și fragmentare în scor (D29) — de fixat la planificarea V1.
- Formatul în care vor veni datele reale și permisiunea de folosire — de confirmat la import.
