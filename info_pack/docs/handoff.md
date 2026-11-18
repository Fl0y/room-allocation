# Starea curentă — RoomAllocation

**Actualizat:** 18 noiembrie 2026. Fișierul descrie doar starea de acum; se rescrie la fiecare etapă încheiată. Istoricul este în `journal.md`, ordinea de citire în `docs-guide.md`.

## Ce există

- **V0 încheiat și prezentat coordonatorului** (proiect acceptat): motorul de alocare (`src/engine/`), cazurile 1–5 (`src/scenarios/`), generatorul și simulatorul (`src/sim/`), demo-ul static (`src/demo/`). Teste: 63 trec, în mediul lui Claude și pe Mac. Rezultate: `results.md`.
- **Documente de orientare:** `glossary.md` (termenii), `project-map.md` (rolul fișierelor, verificată automat de `tests/docs/project-map.test.ts`), `literature.md` (versiunea 1).
- **Decizii:** D01–D34, propunerile confirmate P01–P17; nicio întrebare deschisă (`decisions.md`). Datele (reale și setul sintetic mare) stau în afara Git, în `room-allocation-data/` (D33); repository-ul e public (D34).
- **Nu există:** date reale, bază de date, API, dashboard sau panou reale, Docker.

## Planul V1 (`plan.md` versiunea 2.1)

Ordinea aprobată (D30): **Lotul 3** datele reale → **Lotul 4** cererea cu interval și ferestrele studenților (ordinea de alegere D31) → **Lotul 5** back-end (PostgreSQL, Docker, concurență) → **Lotul 6** interfețe. **Niciun lot nu este autorizat**; autorul autorizează când consideră că proiectul e pregătit.

## Pasul următor

1. **Autorizarea părții 3A** (format intern, set sintetic, săptămâna sintetică), care nu depinde de datele reale. La pornire, autorul creează `~/Desktop/academic_project/room-allocation-data/` și îi dă lui Claude acces la el (Claude lucrează doar pe `synthetic/` și `real/canonical/`).
2. **Autorul obține datele reale** pentru o facultate (D32); la primire urmează partea 3B (convertorul după formatul primit).

## Puncte deschise (neblocante)

- Alegerile generatorului de date (fără conflicte de persoane, ponderile tipurilor, toate rezervările mutabile) — propuneri neconfirmate; de revăzut odată cu datele reale.
- Concept §4.2 (H7 face problema dificilă) trebuie reformulat prudent (`literature.md` §2).
- Codul folosește încă „ferestre izolate” pentru fragmentarea sălilor; termenul se aliniază cu `glossary.md` în Lotul 4.
