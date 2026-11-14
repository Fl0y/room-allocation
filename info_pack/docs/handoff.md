# Starea curentă — RoomAllocation

**Actualizat:** 14 noiembrie 2026 (seara). Fișierul descrie doar starea de acum; se rescrie la fiecare etapă încheiată. Istoricul este în `journal.md`, ordinea de citire în `docs-guide.md`.

## Ce există

- **V0 încheiat:** motorul de alocare (`src/engine/`), cazurile 1–5 (`src/scenarios/`), generatorul și simulatorul (`src/sim/`), demo-ul static (`src/demo/`); 59 de teste trec (mediul lui Claude și Mac). Rezultate: `results.md`.
- **V0 prezentat coordonatorului** de autor; proiectul a fost acceptat (14.11.2026).
- **Analiza literaturii, versiunea 1:** `literature.md` (poziționare ca ipoteze de lucru; lista de citit integral în §9).
- **Documentația:** deciziile D01–D27, propunerile confirmate P01–P15 (`decisions.md`); ghidul `docs-guide.md`, regulile pentru agenți `agent-rules.md`.
- **Nu există:** bază de date, API, dashboard sau panou reale, Docker, date reale.

## Ce e în discuție

Două idei ale coordonatorului, analizate în `coordinator-feedback.md` §4, ca propuneri neaprobate:
- **P16** — structura reală a universității (săli, grupe, orarul existent; profesorii pseudonimizați). Schimbă D08, D24 și regula „date fictive”.
- **P17** — reducerea ferestrelor din orarul studenților, prin alegerea perechii din intervalul profesorului (P11).

## Pasul următor

1. **Autorul răspunde la O14–O20** (`decisions.md`): sursa și forma datelor reale, profesorii, definiția ferestrei, locul ei în ierarhia deciziei, scopul (online / semestrial).
2. **Decizia despre forma V1** (`plan.md` §3), după răspunsuri.
3. Fără autorizare, nu se începe implementarea. Primul pas tehnic probabil (de autorizat): indicatorul „ferestre pe unitate atomică” în simulator, ca bază de măsurare pentru P17.

## Puncte deschise (neblocante)

- Alegerile generatorului de date (fără conflicte de persoane în șirul de cereri, ponderile tipurilor, toate rezervările mutabile) — propuneri, neconfirmate explicit.
- Concept §4.2 (H7 face problema dificilă) trebuie reformulat prudent, conform `literature.md` §2.
