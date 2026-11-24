# Reguli pentru agenți AI și sub-agenți — RoomAllocation

Completează `CLAUDE.md` (care rămâne valabil integral). Se aplică agentului principal al unei sesiuni Claude Code și oricărui sub-agent lansat de el (D44).

## 1. Nivelurile de dificultate și modelul

Regulile folosesc trei niveluri; modelul curent al fiecărui nivel este într-un singur tabel, ca la apariția modelelor noi să se schimbe o singură linie.

| Nivel | Model curent | Când |
|---|---|---|
| **Greu** | Claude Opus 5.5 | Raționament, decizii, corectitudine critică |
| **Mediu** | Claude Sonnet 5.5 | Implementare după un plan aprobat, cu criterii clare |
| **Ușor** | Claude Haiku 5.5 | Sarcini mecanice, fără decizii |

### Nivelul greu (Opus)

- Planificarea etapelor, propunerile de decizii, analiza critică a conceptului.
- Orice modificare a algoritmului: `src/engine/allocate.ts`, `repair.ts`, `score.ts`, `checker.ts`, `units.ts`.
- Back-end-ul cu integritate și concurență (constrângeri în PostgreSQL, tranzacții, lacăte), modelul de date.
- Depanarea problemelor dificile: nepotriviri motor–oracol, teste nedeterministe, încălcări ale constrângerilor.
- Analiza literaturii, poziționarea contribuției, interpretarea rezultatelor din `results.md`, materialele științifice pentru coordonator.
- Code review pe motor și pe back-end.

### Nivelul mediu (Sonnet)

- Implementarea sarcinilor din `plan.md` care au criterii de acceptare clare și nu ating motorul: interfață, demo, API, rapoarte, scripturi, generator, simulator.
- Teste pentru cod existent, refactorizări locale fără schimbare de comportament.
- Actualizarea documentelor la încheierea etapei, după lista din `docs-guide.md` §4.
- Code review pe interfață, scripturi și teste.

### Nivelul ușor (Haiku)

- Căutări și inventare în cod și documente; rezumarea unor fișiere.
- Rularea comenzilor (teste, simulare, build) și raportarea rezultatului, fără a corecta nimic.
- Formatare, bife, extragerea datelor din JSON sau din rapoarte.
- **Nu ia decizii, nu modifică motorul, nu modifică `decisions.md`.**

### Escaladarea la nivelul superior

Agentul se oprește și predă nivelului superior (sau autorului) când:
- cerința e ambiguă sau contrazice `decisions.md`;
- sarcina ajunge să atingă motorul sau modelul de date;
- testele pică după 2 încercări de corectare;
- o soluție ar schimba un comportament verificat (cazurile 1–5, oracolul, determinismul).

Limită: regulile ghidează alegerea modelului, dar nu o impun tehnic. Modelul sesiunii îl alege autorul (în Claude Code: `/model`); agentul principal alege modelul sub-agenților după tabelul de mai sus.

## 2. Sub-agenți

- **Se folosesc doar când aduc un câștig real**: căutări largi în multe fișiere, verificări independente, sarcini paralele fără dependențe. Nu pentru sarcini mici, pe care agentul principal le face mai repede singur.
- **Implicit doar citesc.** Un sub-agent scrie numai dacă sarcina lui o cere explicit și numai în fișierele indicate.
- **Un singur scriitor per fișier** la un moment dat; doi sub-agenți nu modifică același fișier.
- **Nu modifică documentele de coordonare**: `decisions.md`, `journal.md`, `handoff.md`, `plan.md`, `results.md`, `CLAUDE.md`, `docs-guide.md`, `agent-rules.md`. Le actualizează doar agentul principal, după ce consolidează rezultatele.
- **Primesc o sarcină completă**: obiectivul, fișierele relevante, criteriile de acceptare, ce nu au voie să facă. Nu au istoricul sesiunii.
- **Rezultatul lor se verifică** de agentul principal înainte de a fi raportat sau folosit (teste rulate, afirmații confruntate cu sursele).
- **Verificarea independentă**: pentru lucrările critice (motorul, back-end-ul, rezultatele pentru lucrare), verificarea o face un agent care nu a produs lucrarea.

## 3. Reguli de lucru pentru orice agent

- Intrarea în context: nivelul 1 din `docs-guide.md`; restul doar după sarcină și doar secțiunile necesare.
- Fără implementare înaintea autorizării explicite a autorului (`CLAUDE.md`).
- Fără rezultate inventate. Orice cifră din rapoarte provine dintr-o rulare reală și se trece în `results.md` cu sursa.
- Se raportează separat: ce s-a implementat, ce s-a verificat (cu ce comenzi), ce limite rămân.
- Claude Code rulează pe Mac-ul autorului: testele, build-ul și Docker le rulează agentul însuși (D44). Verificarea vizuală în browser și importurile externe (de exemplu Google Calendar) le confirmă autorul. Commit-urile și push-ul le face autorul, dacă nu cere altfel.
- Mesajele de commit nu conțin `Co-Authored-By` sau alte referințe la Claude.
- Motorul de alocare rămâne independent de interfață, HTTP și baza de date.
