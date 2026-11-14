# Starea curentă — RoomAllocation

**Actualizat:** 14 noiembrie 2026. Fișierul descrie doar starea de acum; se rescrie la fiecare etapă încheiată. Istoricul este în `journal.md`, ordinea de citire în `docs-guide.md`.

## Ce există

- **Documentația:** `info_pack/docs/` (vezi `docs-guide.md`), deciziile D01–D27 și propunerile confirmate P01–P15 în `decisions.md`; nicio întrebare deschisă.
- **V0, motorul de alocare (Lotul 1):** `src/engine/` — constrângerile H1–H8, unitățile atomice, alocarea online cu scor lexicografic, reparare cu ≤ 2 mutări de sală, refuz cu alternative, repararea după închiderea unei săli. Cazurile 1–5: `src/scenarios/`.
- **V0, simularea și demo-ul (Lotul 2):** generatorul de date sintetice și simulatorul cu 6 strategii (`src/sim/`); demo-ul static fără bază de date (`src/demo/`).
- **Comenzi:** `npm test`, `npm run typecheck`, `npm run report`, `npm run simulate`, `npm run demo` (detalii în `README.md`).
- **Repository Git privat**, ultimul commit `506cd94` (2026-11-14).
- **Nu există:** bază de date, API, dashboard sau panou reale, Docker, analiza literaturii.

## Ce e verificat

- Loturile 1 și 2: 59 de teste automate trec în mediul lui Claude și pe Mac-ul autorului; simularea completă fără încălcări.
- Rezultatele pe cazuri sunt verificate, iar cele ale simulării sunt preliminare: `results.md`.

## Pasul următor

1. **Analiza literaturii (P14)** în `literature.md`: UniTime, ITC 2019, Phillips et al., Carter & Tovey, Müller et al., potrivirea online cu înlocuiri; poziționarea contribuției ca adaptare + evaluare. Nivel: greu (`agent-rules.md`).
2. **Prezentarea V0 pentru coordonator:** cazurile 1–5, exemplul din `coordinator-feedback.md`, simularea preliminară, demo-ul.
3. **Decizia despre forma V1**, după prezentare (`plan.md` §3).

Nu se începe implementarea fără autorizarea explicită a autorului.

## Puncte deschise (neblocante)

- Alegerile generatorului (fără conflicte de persoane în șirul de cereri, ponderile tipurilor, toate rezervările mutabile) sunt propuneri, neconfirmate explicit de autor.
- Fragmentarea influențează rar decizia în scorul V0; de reevaluat în V1 (P03).
