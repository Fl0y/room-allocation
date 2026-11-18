# Formatul intern al datelor — RoomAllocation

**Versiunea formatului:** 1 (18.11.2026). Bazat pe D21, D28, D33. Codul: `src/data/format.ts`. Exemplul complet, fictiv: `tests/fixtures/mini/`.

Același format pentru datele sintetice și pentru cele reale. Codul citește doar formatul intern; datele reale primite de la universitate ajung aici printr-un convertor scris după formatul lor efectiv (plan.md, 3b.1).

## 1. Unde stau datele (D33)

Datele **nu intră în Git**. Folderul stă lângă repository:

```
academic_project/
  room-allocation/                  ← repository-ul (public, D34)
  room-allocation-data/             ← datele (în afara Git)
    synthetic/
      canonical/                    ← setul sintetic (npm run data:synthetic)
      reports/                      ← rapoartele pe setul sintetic
    real/
      raw/                          ← fișierele originale de la universitate, neatinse
      canonical/                    ← datele reale în formatul intern, profesori pseudonimizați
      pseudonyms                    ← corespondența nume real → pseudonim (doar aici)
      reports/                      ← rapoartele pe datele reale
```

Calea implicită este `../room-allocation-data` față de repository. Altă cale se dă în variabila `RA_DATA_DIR` sau într-un fișier `.env` în rădăcina repository-ului (ignorat de Git):

```
RA_DATA_DIR=../room-allocation-data
```

Claude lucrează doar pe `synthetic/` și pe `real/canonical/`; `real/raw/` și corespondența pseudonimelor nu sunt necesare pentru lucru.

**Ce rămâne în Git:** codul, specificația de față, exemplul mic din `tests/fixtures/mini/` și scriptul care produce setul sintetic cu seed (același seed → aceleași fișiere). Testele și demo-ul public nu depind de folderul extern.

## 2. Fișierele

Un set de date = un folder cu 7 fișiere. CSV: UTF-8, separator virgulă, primul rând = antetul; câmpurile cu virgule se pun între ghilimele (`"Sala 202, etajul 2"`); listele din aceeași celulă se separă cu `;`. Valorile logice: `1`/`0` (se acceptă și `da`/`nu`, `true`/`false`).

### `dataset.json` — descrierea setului

| Câmp | Valoare |
|---|---|
| `format` | `room-allocation/canonical` |
| `version` | `1` |
| `source` | `synthetic` sau `real` |
| `name` | denumirea setului |
| `week` | 5 date ISO, luni–vineri: săptămâna-tip în care se pune orarul |
| `seed` | doar pentru setul sintetic |
| `notes` | opțional |

### `rooms.csv` — sălile

| Coloană | Valoare |
|---|---|
| `id` | identificator unic (de exemplu `LAB-01`) |
| `name` | denumirea afișată |
| `type` | `auditorium`, `seminar` sau `lab` |
| `capacity` | locuri (pentru laborator: locuri de lucru) |
| `computers` | numărul de calculatoare (0 dacă nu are) |
| `projector`, `board` | `1` / `0` |

### `units.csv` — fluxuri, grupe, subgrupe (D21)

| Coloană | Valoare |
|---|---|
| `id` | identificator unic (de exemplu `A1`, `A1-1`, `A1-1/1`) |
| `kind` | `flux`, `group` sau `subgroup` |
| `parent` | unitatea de deasupra (gol pentru flux) |
| `size` | numărul de studenți — **doar pe unitatea cea mai mică** (fără copii) |
| `name` | denumirea afișată |

Numărul de studenți ai unei unități = suma unităților atomice de sub ea.

### `teachers.csv` — profesorii

| Coloană | Valoare |
|---|---|
| `id` | pseudonimul (`P-001` …) |
| `name` | nume fictiv; **niciodată numele real** (D28) |

### `courses.csv` — disciplinele

`id`, `name`.

### `assignments.csv` — repartizările (cine predă ce, la cine)

| Coloană | Valoare |
|---|---|
| `id` | identificator unic |
| `course` | disciplina |
| `teacher` | profesorul |
| `activity` | `lecture`, `seminar`, `lab`, `event`, `exam` sau `other` |
| `units` | unitățile participante, separate cu `;` |
| `room_types` | tipurile de sală acceptabile, separate cu `;`, în ordinea preferinței |
| `min_computers` | gol, un număr, sau `students` = câte un calculator pentru fiecare student |
| `projector` | `1` dacă e nevoie de proiector |
| `length` | durata unei ședințe, în perechi |
| `per_week` | câte ședințe pe săptămână |

### `timetable.csv` — orarul existent

| Coloană | Valoare |
|---|---|
| `id` | identificator unic |
| `assignment` | repartizarea |
| `day` | 1 = luni … 5 = vineri |
| `start` | prima pereche (1–7) |
| `length` | numărul de perechi |
| `room` | sala |
| `status` | `movable` (implicit, dacă e gol), `frozen` sau `fixed` (doar evenimente și examene, D19) |

Recurența nu este încă modelată: orarul descrie o săptămână-tip. Săptămânile pare/impare, dacă există în datele reale, se tratează la 3b.

## 3. Validarea (`npm run data:check -- <synthetic|real>`)

Raportul (`reports/validation.html` și `.json`) listează fiecare problemă cu fișierul și linia.

**Erori** (datele nu pot fi folosite până nu se corectează): fișier sau coloană lipsă; valoare invalidă (`ENUM`, `NUMBER`, `BOOLEAN`, `DAY`); identificator duplicat; referință către ceva inexistent (`REF`); ierarhie de unități greșită (`UNITS`); conflict în orar găsit de verificatorul independent (`CONFLICT_H1` sală, `CONFLICT_H2` profesor, `CONFLICT_H3` grupă, `CONFLICT_H4`/`H5` capacitate, tip, echipamente, `CONFLICT_INVALID` de exemplu fixare nepermisă).

**Avertismente** (datele se pot folosi, dar merită verificate): ședințe în orar diferite de `per_week`; durată diferită de cea din repartizare; repartizare pentru care nicio sală nu corespunde (`NO_ROOM`); laborator fără calculatoare; ierarhie cu tipuri neobișnuite.

Pe datele reale, conflictele din orar nu se corectează automat: raportul le arată, autorul decide.

## 4. Setul sintetic (`npm run data:synthetic`)

Generatorul (`src/sim/faculty.ts`) produce o facultate inventată, cu structură aproximativă. Valorile implicite sunt **propuneri** (neconfirmate), de recalibrat după datele reale (3b.2):

- 4 programe × 3 ani = 12 fluxuri; 1–3 grupe pe flux, 16–30 de studenți; grupele de cel puțin 20 se împart în două subgrupe pentru laborator;
- 5–6 discipline pe flux; fiecare are curs pe flux și, în jumătate din cazuri, laborator pe subgrupă, altfel seminar pe grupă; 1–2 ședințe pe săptămână;
- 4 auditorii (60–140 de locuri), 7 săli de seminar (24–36), 8 laboratoare (14–26 de calculatoare);
- profesori cu cel mult 6–12 perechi pe săptămână;
- orarul este făcut „ca de om”: compact pentru grupe, cu preferință pentru dimineață și cu zgomot; sala se alege la întâmplare dintre sălile libere de tipul principal. Scorul motorului **nu** se folosește, ca măsurătorile de bază să nu fie favorabile artificial algoritmului.

## 5. Săptămâna în simulator (`npm run week -- <synthetic|real>`)

Orarul devine rezervări existente; peste el se generează cereri suplimentare cu seed (recuperări, consultații, evenimente fixe) până la o fracțiune din perechile-sală libere. Fiecare strategie primește aceleași cereri, în aceeași ordine. Raportul (`reports/week.html` și `.json`) conține măsurătorile de bază ale orarului și comparația strategiilor. Alegerile generatorului de cereri (fără conflicte de persoane, zi și pereche uniforme, orarul mutabil) sunt propuneri, de revăzut cu datele reale.
