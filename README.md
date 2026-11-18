# RoomAllocation

Algoritmul de alocare a sălilor universitare (proiect academic). Documentația și deciziile sunt în `info_pack/docs/`; planul activ este `info_pack/docs/plan.md`. Ordinea de citire și regulile de modificare a documentelor: `info_pack/docs/docs-guide.md`; rolul fiecărui fișier: `project-map.md`; termenii: `glossary.md`; starea curentă: `handoff.md`; istoricul: `journal.md`; rezultatele: `results.md`.

## Stadiul

V0 încheiat (Loturile 1–2: motorul, simularea, demo-ul). V1: partea 3A (formatul intern al datelor, setul sintetic al facultății, săptămâna în simulator) — `info_pack/docs/data-format.md`; Lotul 4 (cererea cu interval: motorul alege și perechea, ținând cont de ferestrele studenților, D29, D31).

## V0 — motorul de alocare, simularea și demo-ul

Motorul este pur (fără interfață, HTTP sau bază de date):

- constrângerile H1–H7 și verificarea tranzițiilor (H8, D19) — `src/engine/checker.ts`;
- ierarhia flux → grupă → subgrupă, cu unități atomice (D21) — `src/engine/units.ts`;
- alocarea online cu scor lexicografic (raritate → excedent → fragmentare, D25), cel mult M mutări de sală la aceeași oră, refuz motivat cu alternative propuse (D18, D20) — `src/engine/allocate.ts`;
- repararea după închiderea unei săli (cazul 5, D19) — `src/engine/repair.ts`;
- cazurile 1–5 din concept și exemplul pentru coordonator — `src/scenarios/cases.ts`;
- generatorul de date sintetice cu seed și simulatorul care compară strategiile — `src/sim/`;
- demo-ul interactiv (pagină statică, fără bază de date) — `src/demo/`.

## Comenzi

Necesită Node 24 (vezi `.node-version`).

```bash
npm ci              # instalează versiunile fixate în package-lock.json
npm test            # toate testele (unitare, cazuri, oracol exhaustiv, determinism)
npm run typecheck   # verificarea tipurilor TypeScript
npm run report      # generează out/cases.html (cazurile 1–5, înainte/după)
npm run simulate    # simularea (≈1 min): out/simulation.html + out/simulation.json
npm run demo        # construiește out/demo.html (deschide-l direct în browser)

# datele (în afara repository-ului, implicit ../room-allocation-data; vezi info_pack/docs/data-format.md)
npm run data:synthetic          # generează setul sintetic (seed 1) în synthetic/canonical/
npm run data:check -- synthetic # raportul de validare (sau: real)
npm run week -- synthetic       # orarul + cereri suplimentare, comparația strategiilor (sau: real)
npm run interval -- synthetic   # Lotul 4: ora fixă vs. interval fără / cu criteriul ferestrelor (sau: real)
```

## Structura

```
src/engine/      motorul de alocare (independent de interfață și BD)
src/scenarios/   scenariile demonstrative (date sintetice) și rularea lor
src/data/        formatul intern al datelor: citire, validare, construirea săptămânii (Lotul 3)
src/sim/         generatoarele de date sintetice, simulatorul, săptămâna și măsurătorile ei
src/demo/        demo-ul: logica (controller.ts) și interfața (main.ts)
tests/engine/    testele motorului
tests/oracle/    oracolul exhaustiv (independent de căutarea motorului)
tests/support/   generatorul de instanțe mici aleatoare, cu seed
tests/sim/       generatoarele, simulatorul, săptămâna
tests/data/      formatul intern
tests/fixtures/  exemplul mic fictiv în formatul intern (testele nu depind de folderul extern)
tests/demo/      logica demo-ului
scripts/         raportul cazurilor, simularea, demo-ul, datele (generare, validare, săptămâna)
```
