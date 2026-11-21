# Planul proiectului — RoomAllocation

**Versiune:** 2.1 (18.11.2026; Lotul 3 împărțit după D33). **Statut:** V0 încheiat; V1 cu ordinea aprobată; partea 3A și Lotul 4 încheiate (18.11.2026); Lotul 5 încheiat (21.11.2026). Bazat pe deciziile D01–D35 și P01–P17 din `decisions.md`. Singura copie activă a planului.
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
| Scor V0 | **Lexicografic** (D25, fără calibrare): raritate, apoi excedent, apoi fragmentare simplă (goluri izolate de 1 pereche în programul sălii). Varianta ponderată și fragmentarea ponderată de cerere (P03) se studiază în V1 |

## 3. Etape

### V0 — algoritmul funcțional, vizibil

**Etapa 0 — documente și mediu** (fără cod de aplicație)
- [x] Preluarea proiectului, analiza critică, deciziile D01–D24, P01–P15 (06–08.11.2026)
- [x] Răspunsuri la feedback-ul coordonatorului (`coordinator-feedback.md`)
- [x] Verificarea mediului pe Mac (D27); versiuni fixate: TypeScript 7.0.2, Vitest 5.1.0, @types/node 24.19.2
- [x] Repository Git privat; structura minimă a folderului (08.11.2026, creat de autor)

**Lotul 1 — motorul de alocare și cazurile 1–5** — *încheiat la 08.11.2026; verificat în mediul lui Claude și pe Mac de autor*
- [x] 1a. Model, verificator independent, constrângeri H1–H7 (cu teste negative pentru fiecare)
- [x] 1b. Alocare online: candidați, scor lexicografic, reparare cu M ≤ 2 mutări, refuz cu motive și alternative; oracol exhaustiv pe instanțe mici
- [x] 1c. Cazurile 1–5 din concept ca teste automate; raport vizual static „înainte/după” (grila săli × perechi)

**Lotul 2 — simulare și demo** — *încheiat; implementat la 08.11.2026, verificat în mediul lui Claude și pe Mac de autor (commit `0ce3c53`, 11.11.2026)*
- [x] 2a. Generator sintetic cu seed (D24): săli pe tipuri, fluxuri/grupe/subgrupe, secvențe de cereri cu încărcare variabilă
- [x] 2b. Simulator: aceleași secvențe pentru strategiile A (prima sală liberă), B (best-fit), C (scor V0), C + mutări (M = 1, 2); indicatori (secțiunea 5)
- [x] 2c. Demo interactiv **fără bază de date**: grila săli × perechi, formular de cerere, decizia și explicația, rularea unui scenariu pas cu pas. Prezentat explicit ca demonstrație, nu ca produs

**În paralel — analiza literaturii (P14)**
- [x] `literature.md` (versiunea 1, 14.11.2026; de aprofundat lista din §9): UniTime, ITC 2019, Phillips et al., Carter & Tovey, Müller et al., online matching cu înlocuiri; poziționarea contribuției (adaptare + evaluare)

**Sfârșitul V0:** ✅ prezentat coordonatorului de autor, proiect acceptat (14.11.2026); ideile noi: P16, P17. Conținutul prezentării: (cazurile 1–5, exemplul din `coordinator-feedback.md`, primele simulări); decizia despre forma V1.

### V1 — versiunea matură

**Statut (18.11.2026):** ordinea loturilor și ordinea de alegere din Lotul 4 sunt **aprobate de autor** (D30, D31); fiecare lot se autorizează separat. **Partea 3A este autorizată (18.11.2026)**; partea 3B așteaptă datele reale (autorul le solicită administrației și decanatului). **Lotul 4 este încheiat (18.11.2026)**, pe setul sintetic. **Lotul 5 este încheiat (21.11.2026)**, fără API HTTP (acesta intră în Lotul 6, cu Next.js). Lotul 6 nu este autorizat.

**Ordinea:** datele reale → algoritmul extins → back-end-ul → interfețele. Fiecare lot are 2–3 sub-pași mici, fiecare încheiat cu verificare (D17). Dacă datele reale întârzie, Lotul 4 poate începe înaintea Lotului 3, pe date sintetice (cu autorizare).

**Lotul 3 — Datele (D28, D32, D33)** — model recomandat: Opus pentru formatul intern și validare, Sonnet pentru import și convertor

*3A — pe date sintetice (nu depinde de decanat). Implementată și verificată în mediul lui Claude și pe Mac (autorul, 18.11.2026; commit `a813fcb`).*
- [x] 3a.1. Formatul intern (`canonical`) documentat: săli, flux/grupă/subgrupă, profesori, repartizarea profesor–disciplină–grupă, orar; încărcarea lui în instanța motorului; calea din `RA_DATA_DIR`; un exemplu mic fictiv în Git, pe care rulează testele
- [x] 3a.2. Setul sintetic al facultății: script cu seed în repository, care scrie în `room-allocation-data/synthetic/canonical/` (structură aproximativă a facultății); raportul de validare: capacități, tipuri, echipamente, mărimile grupelor, conflictele din orar (sală, profesor, grupă la aceeași oră)
- [x] 3a.3. „Săptămâna sintetică” în simulator: orarul ca rezervări existente + cereri suplimentare (recuperări, consultații, evenimente) generate după repartizare; măsurătorile de bază: utilizarea sălilor, săli rare folosite inutil, ferestrele studenților

*3B — pe date reale (după primirea lor)*
- [ ] 3b.1. Convertorul `real/raw → real/canonical`, scris după formatul efectiv primit; **pseudonimizarea automată** a profesorilor (`P-001`…), cu corespondența doar în `real/`
- [ ] 3b.2. Raportul de validare și „săptămâna reală” în simulator, rulate local; comparația set sintetic ↔ date reale (cât de bine a anticipat setul sintetic structura reală)
- Domeniul: întâi o singură facultate, apoi extindere treptată (D32). Recurența nu e încă modelată: o „săptămână-tip” (sau două, pentru săptămâni pare/impare), ca date concrete. Demo-ul public folosește doar date sintetice.

**Lotul 4 — Cererea cu interval și ferestrele studenților (D29, varianta a)** — model recomandat: Opus

*Lotul 4 încheiat: 4a–4c verificate pe Mac de autor (18.11.2026; 103 teste). Pe săptămâna reală, 4c se rulează după 3B.*
- [x] 4a. Motorul: cererea cu interval opțional de perechi; motorul încearcă fiecare început posibil; calculul variației ferestrelor pe subgrupă și zi; ordinea de alegere **mutări → săli rare → ferestrele studenților → locuri goale → fragmentarea programului sălii** (D31); explicația include ferestrele; alinierea termenilor din cod cu `glossary.md` („goluri izolate” pentru săli, „ferestre” pentru studenți)
- [x] 4b. Verificarea: oracolul exhaustiv extins la intervale, cazuri noi (grupă cu perechile 1–2 și interval 3–5 → perechea 3; conflict sală rară vs. fereastră; subgrupe cu laboratoare la ore diferite), determinism
- [x] 4c. Simularea: oră fixă vs. interval fără criteriul ferestrelor vs. interval cu criteriul ferestrelor, pe date sintetice și pe săptămâna reală; M = 3 ca reper (`results.md` §3.5)

**Lotul 5 — Back-end-ul** — model recomandat: Opus

*Lotul 5 încheiat: verificat în mediul lui Claude (PostgreSQL 16 local) și pe Mac de autor (PostgreSQL 18.7 în Docker, 21.11.2026). API-ul HTTP nu face parte din lot (decizia autorului, 21.11.2026).*
- [x] 5a. Docker (PostgreSQL 18, imagine fixată; containerul Node 24 vine cu serverul din Lotul 6); schema și migrațiile SQL; constrângeri de excludere în baza de date pentru sală, profesor și unitate atomică la aceeași pereche
- [x] 5b. Serviciul tranzacțional: blocare per zi → citirea stării → decizia motorului (neschimbat) → scrierea rezervării și a mutărilor într-o singură tranzacție; idempotența cererilor
- [x] 5c. Teste de integrare pe baza de date reală: cereri simultane pentru ultima sală, mutări atomice, teste de mutație (scoaterea unei constrângeri trebuie detectată)

**Lotul 6 — Interfețele** — model recomandat: Sonnet
- [ ] 6a. API (cereri cu sau fără interval, lista rezervărilor, aplicarea alternativelor, închiderea sălilor)
- [ ] 6b. Dashboard-ul profesorului, panoul studenților (orar pe flux/grupă/subgrupă), pagina de administrare (săli, închideri); roluri simplificate, fără autentificare reală (P15)
- [ ] 6c. Export .ics pe grupă/profesor (P12); import CSV, refolosind importul din Lotul 3 (P15)

**După V1 (versiuni ulterioare):** recurența (D16); planificarea semestrului — varianta (b) — cu un solver existent (CP-SAT; tehnologia de integrare se alege atunci), comparată cu varianta online (Î3); reoptimizarea periodică vs. mutările la fiecare cerere; validarea pe ITC 2019 (D24); experimentele finale (seed-uri separate pentru calibrare, intervale de încredere); aprofundarea literaturii (`literature.md` §9).

## 4. Criterii de acceptare — Lotul 1

1. Verificatorul detectează fiecare încălcare H1–H7, cu cel puțin un test negativ pentru fiecare constrângere.
2. **Cazul 4:** refuz `GROUP_BUSY` cu activitatea care se suprapune; alternativele propuse sunt valide pentru profesor și pentru grupă (confirmat de verificator).
3. **Cazurile 1–3:** cererea este refuzată cu M = 0 și acceptată cu M = 2, cu 2, 1 și 1 mutări; în cazul 3, excedentul scade de la 95 la 15 locuri; starea finală trece verificatorul.
4. **Cazul 5:** fixarea se anulează la închiderea pentru reparații (D19); fiecare rezervare afectată este realocată la aceeași oră sau listată ca nerezolvată, cu motiv; raportul le numără separat. Datele concrete ale celor 9 rezervări se construiesc sintetic și se prezintă autorului înaintea testului.
5. **Oracol:** pe cel puțin 1000 de instanțe mici aleatoare (seed fix), motorul găsește un plan cu ≤ M mutări dacă și numai dacă oracolul găsește unul, iar numărul de mutări este minim.
6. **Determinism:** aceeași intrare dă aceeași decizie și explicație, inclusiv cu sălile date în altă ordine.
7. Raportul vizual se deschide direct în browser și arată, pentru fiecare caz, grila înainte și după, mutările și explicația.
8. Raport de etapă: implementat / verificat / limite. Testele se rulează de autor pe Mac.

## 4bis. Criterii de acceptare — Lotul 2

1. **Generator:** același seed dă aceeași instanță și același șir de cereri; unitățile trec validarea (D21); în șirul generat profesorii și grupele nu au suprapuneri între ele, astfel încât refuzurile provin doar din lipsa sălilor; încărcarea obținută este în ±5% față de încărcarea țintă.
2. **Simulator:** toate strategiile primesc același șir de cereri (comparație pereche); starea finală a fiecărei rulări trece verificatorul; fiecare pas respectă tranzițiile (H8); rezultatele sunt reproductibile (același seed → aceleași cifre, cu excepția timpilor).
3. **Raport** `out/simulation.html` (+ datele brute JSON): indicatorii din §5 pe strategii și niveluri de încărcare, diferențe pereche față de strategia de referință cu interval de încredere de 95%, marcate explicit ca **preliminare, pe date sintetice**.
4. **Demo** `out/demo.html`: se deschide direct din fișier, fără rețea; permite rularea pas cu pas a cazurilor 1–5, trimiterea unei cereri noi cu decizia și explicația, aplicarea unei alternative, închiderea unei săli, compararea strategiilor pentru aceeași cerere, revenirea la starea inițială.
5. Logica demo-ului este separată de DOM și testată; testele existente continuă să treacă.

## 4ter. Criterii de acceptare propuse — loturile V1 (se definitivează la autorizarea fiecărui lot)

**Lotul 3**
1. Încărcarea rulează pe exemplul mic din Git, pe setul sintetic și (3B) pe datele reale; același input dă același rezultat; testele din repository trec fără folderul extern.
2. Niciun nume real de profesor nu apare în datele rezultate, în rapoarte sau în Git (test automat pe lista de nume din corespondență, rulat local).
3. Datele importate trec validarea unităților (D21) și verificatorul H1–H7, **sau** raportul de validare listează fiecare abatere, cu sursa ei din fișierul original.
4. Săptămâna sintetică (3A) și cea reală (3B) se pot rula în simulator; măsurătorile de bază (utilizare, săli rare, ferestrele studenților) apar în `results.md`, marcate ca rezultate pe date reale.

**Lotul 4**
1. Fără interval, motorul dă exact aceleași decizii ca în V0 (testele existente trec neschimbate).
2. Cu interval: pe instanțe mici aleatoare, motorul găsește o variantă dacă și numai dacă oracolul găsește una, iar varianta aleasă este minimă după ordinea D31.
3. Cazurile noi au rezultatul așteptat, scris înaintea implementării și aprobat de autor.
4. Simularea compară cele trei variante pe aceleași cereri, cu diferențe pe perechi și intervale de încredere.

**Lotul 5**
1. Baza de date refuză singură orice suprapunere de sală, profesor sau unitate atomică (test direct pe SQL, fără motor).
2. La cereri simultane pentru ultima sală liberă: exact una reușește, celelalte primesc refuz motivat; nicio stare intermediară nu e vizibilă.
3. Mutările unei cereri se aplică toate sau niciuna.
4. Scoaterea oricărei constrângeri face cel puțin un test să pice.

**Lotul 6**
1. Fiecare funcție din interfață este verificată printr-un test sau o verificare în browser documentată; o pagină existentă nu înseamnă funcție verificată (`CLAUDE.md`).
2. Fișierul .ics generat se importă corect în Google Calendar (verificat de autor).

## 5. Indicatori (V0, preliminari)

Cereri acceptate; perechi acceptate (D22); mutări per cerere acceptată; locuri neutilizate; perechi de săli rare consumate de activități care nu au nevoie de ele; goluri izolate (în programul sălii); conflicte rămase (trebuie să fie 0); timpul per cerere (mediană, p95). Rezultatele V0 sunt **preliminare**: nu se formulează concluzii generale înainte de protocolul din V1.

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
| Disponibilitate instabilă (D17) | Loturi mici, fiecare încheiat cu verificare și intrare în `journal.md` |
| Scopul crește (orar complet, P11) | P11 și modul lot doar în V1, după evaluarea V0 |

## 9. Evidență

Evidența etapelor este în `journal.md`; rezultatele în `results.md`. Aici rămân doar bifele din §3.
