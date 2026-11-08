# Planul proiectului — RoomAllocation

**Versiune:** 1.1 (08.11.2026). **Statut:** propunere de plan, bazată pe deciziile D01–D27 și P01–P15 din `decisions.md`. Singura copie activă a planului.
Se bifează doar sarcinile efectiv finalizate și verificate. Structura feliilor se poate ajusta pe parcurs (P10).

---

## 1. Obiectiv și limite

**Obiectiv general:** un algoritm de alocare a sălilor universitare, evaluat reproductibil, cu un sistem minim care îl face vizibil (dashboard, panou). Prioritatea este valoarea științifică (D14).

**Strategia (D23):** întâi **V0**, o versiune simplă cu algoritmul funcțional, pe care se văd decizia, explicația și comparația strategiilor; apoi **V1**, versiunea matură (bază de date, concurență, interfețe, extensii).

**Nu intră în proiect:** orarul complet construit automat (P01); deplasarea între clădiri (D11); preferințele personale ale profesorilor (D12); sincronizarea bidirecțională cu Google Calendar (P12); utilizarea comercială (D14).

**Nu intră în V0:** baza de date, concurența, autentificarea, recurența (D16), modul lot și solverul exact (P08), intervalele libere ale profesorilor (P11), exportul .ics și importul CSV (P12, P15), datele ITC 2019 (D24).

## 2. Modelul pentru V0 (rezumat)

| Element | În V0 |
|---|---|
| Timp | Grila D15: 7 perechi pe zi; rezervări pe o singură dată (D16); orizont de 1–5 zile |
| Săli | Tip (auditoriu, seminar, laborator), capacitate, număr de calculatoare, proiector/ecran, tablă (P13), stare (deschisă / închisă pentru reparații) |
| Participanți | Flux → grupă → subgrupă; unități atomice; număr de studenți doar pe unitatea cea mai mică (D21) |
| Cerere | Profesor, unități participante, tip de activitate, cerințe de sală, dată, perechi consecutive (1..k), număr de studenți dedus (D21) |
| Rezervare | Cererea + sala + stare: mutabilă / fixată (doar evenimente și examene, D19) / în orizontul înghețat |
| Constrângeri | H1–H7 în motor; H8 conform D19; H3 prin unități atomice (D21) |
| Decizie | Ierarhia D18: valid → cele mai puține mutări (M ≤ 2) → scor → departajare deterministă; altfel refuz cu motiv + alternative propuse |
| Scor V0 | **Lexicografic** (D25, fără calibrare): raritate, apoi excedent, apoi fragmentare simplă (ferestre izolate de 1 pereche). Varianta ponderată și fragmentarea ponderată de cerere (P03) se studiază în V1 |

## 3. Etape

### V0 — algoritmul funcțional, vizibil

**Etapa 0 — documente și mediu** (fără cod de aplicație)
- [x] Preluarea proiectului, analiza critică, deciziile D01–D24, P01–P15 (06–08.11.2026)
- [x] Răspunsuri la feedback-ul coordonatorului (`feedback-coordonator.md`)
- [x] Verificarea mediului pe Mac (D27); versiuni fixate: TypeScript 7.0.2, Vitest 5.1.0, @types/node 24.19.2
- [ ] Repository Git privat; structura minimă a folderului

**Lotul 1 — motorul de alocare și cazurile 1–5** — *implementat la 08.11.2026; verificat în mediul lui Claude (Linux, Node 22); se bifează după rularea pe Mac (criteriul 8)*
- 1a. Model, verificator independent, constrângeri H1–H7 (cu teste negative pentru fiecare)
- 1b. Alocare online: candidați, scor lexicografic, reparare cu M ≤ 2 mutări, refuz cu motive și alternative; oracol exhaustiv pe instanțe mici
- 1c. Cazurile 1–5 din concept ca teste automate; raport vizual static „înainte/după” (grila săli × perechi)

**Lotul 2 — simulare și demo**
- 2a. Generator sintetic cu seed (D24): săli pe tipuri, fluxuri/grupe/subgrupe, secvențe de cereri cu încărcare variabilă
- 2b. Simulator: aceleași secvențe pentru strategiile A (prima sală liberă), B (best-fit), C (scor V0), C + mutări (M = 1, 2); indicatori (secțiunea 5)
- 2c. Demo interactiv **fără bază de date**: grila săli × perechi, formular de cerere, decizia și explicația, rularea unui scenariu pas cu pas. Prezentat explicit ca demonstrație, nu ca produs

**În paralel — analiza literaturii (P14)**
- `literatura.md`: UniTime, ITC 2019, Phillips et al., Carter & Tovey, Müller et al., online matching cu înlocuiri; poziționarea contribuției (adaptare + evaluare)

**Sfârșitul V0:** prezentare pentru coordonator (cazurile 1–5, exemplul din `feedback-coordonator.md`, primele simulări); decizia despre forma V1.

### V1 — versiunea matură (ordine propusă, de revizuit după V0)

1. **Back-end:** PostgreSQL cu constrângeri (sală, profesor, unitate atomică pe slot), tranzacții cu lacăt, mutări atomice, idempotență; teste de integrare pe BD reală, teste de concurență, teste de mutație (moștenire TableFlow)
2. **API + dashboard de rezervare** pentru profesori, refolosind grila din V0
3. **Panou/orar** pentru studenți; **export .ics** (P12); **import CSV** (P15)
4. **Extensii ale algoritmului:** recurența (D16); modul lot cu criteriul D22; solverul exact CP-SAT (P08); intervalele libere ale profesorilor (P11); fragmentarea ponderată de cerere (P03)
5. **Experimente** Î1–Î4 (P06), protocol pereche pe seed-uri, intervale de încredere; **validare pe ITC 2019** (D24)
6. **Lucrarea:** scenariul de integrare în ASEM (P15), rezultatele, limitele

## 4. Criterii de acceptare — Lotul 1

1. Verificatorul detectează fiecare încălcare H1–H7, cu cel puțin un test negativ pentru fiecare constrângere.
2. **Cazul 4:** refuz `GROUP_BUSY` cu activitatea care se suprapune; alternativele propuse sunt valide pentru profesor și pentru grupă (confirmat de verificator).
3. **Cazurile 1–3:** cererea este refuzată cu M = 0 și acceptată cu M = 2, cu 2, 1 și 1 mutări; în cazul 3, excedentul scade de la 95 la 15 locuri; starea finală trece verificatorul.
4. **Cazul 5:** fixarea se anulează la închiderea pentru reparații (D19); fiecare rezervare afectată este realocată la aceeași oră sau listată ca nerezolvată, cu motiv; raportul le numără separat. Datele concrete ale celor 9 rezervări se construiesc sintetic și se prezintă autorului înaintea testului.
5. **Oracol:** pe cel puțin 1000 de instanțe mici aleatoare (seed fix), motorul găsește un plan cu ≤ M mutări dacă și numai dacă oracolul găsește unul, iar numărul de mutări este minim.
6. **Determinism:** aceeași intrare dă aceeași decizie și explicație, inclusiv cu sălile date în altă ordine.
7. Raportul vizual se deschide direct în browser și arată, pentru fiecare caz, grila înainte și după, mutările și explicația.
8. Raport de etapă: implementat / verificat / limite. Testele se rulează de autor pe Mac.

Criteriile Lotului 2 se detaliază la încheierea Lotului 1.

## 5. Indicatori (V0, preliminari)

Cereri acceptate; perechi acceptate (D22); mutări per cerere acceptată; locuri neutilizate; perechi de săli rare consumate de activități care nu au nevoie de ele; ferestre izolate; conflicte rămase (trebuie să fie 0); timpul per cerere (mediană, p95). Rezultatele V0 sunt **preliminare**: nu se formulează concluzii generale înainte de protocolul din V1.

## 6. Strategia de test

- **Unit** (fără BD): constrângeri, verificator, scor, alocare, reparare.
- **Oracol:** căutare exhaustivă pe instanțe mici, independentă de euristică.
- **Scenarii:** cazurile 1–5 ca secvențe de evenimente (sosire, anulare, închidere), nu ca instantanee.
- **Proprietăți:** orice stare produsă trece verificatorul; determinismul.
- **V1:** integrare pe PostgreSQL real, concurență, mutație.

## 7. Mediu și tehnologii

- V0: TypeScript (Node 24, fără pas de compilare: Node rulează direct fișierele .ts), Vitest; demo static fără framework, cu esbuild în Lotul 2 (D26). Fără containere în V0 (D27).
- V1: stackul P07 (Next.js, PostgreSQL, Docker, Zod), refolosind motorul V0 neschimbat.
- Versiunile se aleg și se fixează în ziua instalării; mediul se verifică pe Mac de autor (comenzile `node`, `docker`, `git` le rulează autorul).

## 8. Riscuri

| Risc | Măsură |
|---|---|
| Contribuția se suprapune cu lucrări existente (UniTime folosește deja perturbarea minimă) | Analiza literaturii în paralel cu V0; contribuția formulată ca adaptare + evaluare |
| Demo-ul V0 e confundat cu un produs funcțional | Etichetat ca demonstrație; integritatea și concurența vin în V1, înaintea interfeței reale |
| Generatorul sintetic favorizează scorul calibrat pe aceeași distribuție | Seed-uri separate pentru calibrare și evaluare; validare ulterioară pe ITC 2019 |
| Oracolele din cazurile 1–5 sunt scrise de mână | Verificator și oracol exhaustiv independente de motor |
| Disponibilitate instabilă (D17) | Loturi mici, fiecare încheiat cu verificare și jurnal în `handoff.md` |
| Scopul crește (orar complet, P11) | P11 și modul lot doar în V1, după evaluarea V0 |

## 9. Evidență

| Data | Etapă | Rezultat |
|---|---|---|
| 08.11.2026 | Etapa 0 (documente) | Plan creat; nimic implementat |
| 08.11.2026 | Etapa 0 (mediu), Lotul 1 | Mediu verificat (D27). Lotul 1 implementat: 42 de teste trec în mediul lui Claude; așteaptă rularea pe Mac. Detalii în `handoff.md` |
