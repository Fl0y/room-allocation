# Analiza literaturii (P14) — RoomAllocation

**Versiune:** 1 (14.11.2026). **Statut:** prima trecere prin literatură, pe baza rezumatelor, a fragmentelor și a documentației publice găsite prin căutare; lucrările marcate cu ◐ nu au fost citite integral. Concluziile de poziționare sunt **ipoteze de lucru**, nu afirmații de noutate (CLAUDE.md, P14). Bibliografia completă este la final (§10); în text, trimiterile sunt de forma [n].

## 1. Unde se plasează proiectul

Literatura de *educational timetabling* distinge mai multe probleme; proiectul atinge patru niveluri:

| Nivel | Ce se decide | Formulări / sisteme de referință | Relația cu RoomAllocation |
|---|---|---|---|
| Orarul complet (*course timetabling*) | Ora **și** sala pentru toate activitățile | ITC-2007 CB-CTT și PE-CTT [5][6], ITC 2019 [8][9], UniTime [10] | În afara V0 (P01); devine relevant prin ideile din 14.11.2026 (P11, compactarea, §6) |
| Alocarea sălilor cu orele fixate (*classroom assignment*) | Doar sala | Carter & Tovey [1], Lach & Lübbecke [3][4], Phillips et al. [12] | Modul lot (P01) și repararea |
| Perturbarea minimă (*minimal perturbation*) | Modificări cât mai mici ale unei soluții existente | Barták et al. [13], Müller et al. [14], Phillips et al. [15], UniTime [10] | Mutările (P04), cazul 5 |
| Decizii online cu reasignări | Rezervări care sosesc pe rând, cu reasignări limitate | Online matching cu înlocuiri [17], *room committing* în hoteluri [18], interval scheduling online [16] | Nucleul V0 (modul online) |

Supravegherea de ansamblu a formulărilor standard și a benchmark-urilor: Ceschia, Di Gaspero, Schaerf (2023) [7]; pentru CB-CTT: Bettinelli et al. (2015) [11] ◐.

## 2. Complexitatea: ce e ușor și ce e greu

- **Alocarea sălilor pe o singură perioadă este polinomială.** Cu orele fixate și fără legături între perioade, alocarea sălilor se reduce la o potrivire bipartită (cu ponderi) per perioadă; Lach & Lübbecke folosesc exact această descompunere — întâi orele, apoi, pentru fiecare perioadă, o potrivire de cost minim — și garantează fezabilitatea etapei a doua prin condiții de tip Hall impuse în prima [3][4]. Phillips et al. reamintesc că varianta fără legături între evenimente este o problemă de asignare rezolvabilă în timp polinomial (Carter & Tovey) [12].
- **Legăturile între perioade fac problema mai grea.** În CB-CTT, *room stability* (toate lecțiile unui curs în aceeași sală) introduce dependențe între perioade, care împiedică descompunerea pe perioade [4][3]. Phillips et al. arată că măsurile de calitate bazate pe „tipare” (de exemplu stabilitatea sălii la nivel de curs) sunt cele mai dificile, dar indică faptul că stabilitatea pe perioade **contigue** poate rămâne tratabilă în practică [12] ◐. **Relevanță directă:** coeziunea blocului (H7, D06) este exact o stabilitate a sălii pe perioade contigue; afirmația din concept §4.2 („H7 face problema dificilă”) trebuie formulată prudent până la citirea integrală a [1] și [12].
- **Decizia online nu are garanții generale de aproximare.** Pentru interval scheduling online cu decizii irevocabile, raportul competitiv depinde de raportul dintre cel mai lung și cel mai scurt interval [16]; permiterea reasignărilor schimbă natura problemei: în potrivirea bipartită online cu înlocuiri, strategia „cel mai scurt drum de augmentare” face amortizat O(log² n) înlocuiri pe inserție [17]. Mutările din V0 (lanțuri de ≤ M mutări) sunt căi de augmentare scurte, limitate (D18).

## 3. Sisteme și date reale

- **UniTime** (Purdue University, open source): sistem complet de orar (cursuri, examene, evenimente, *student sectioning*), rezolvat cu căutare înainte iterativă și branch and bound pe un model de satisfacere a constrângerilor cu ponderi; include metode de modificare a unei soluții cu impact minim [10]. Pentru perturbări, documentația UniTime descrie căutarea de schimbări care nu afectează mai mult de două alte activități (vezi `coordinator-feedback.md`). Modulul de evenimente afișează disponibilitatea sălilor și conflictele, iar utilizatorul selectează sala și intervalul; în documentația consultată nu apare o alegere automată a sălii cu reasignări pentru rezervările ad-hoc ◐ (de verificat în cod/manual complet).
- **ITC 2019** [8][9]: 30 de instanțe reale din zece universități, colectate prin UniTime, combinând *student sectioning* cu alocarea orelor și a sălilor; 19 tipuri de constrângeri de distribuție, dintre care `MaxBreaks` (numărul de pauze pe zi) și `MaxBlock` (lungimea blocurilor de activități consecutive) sunt direct legate de compactare [9]. Instanțe reduse, preprocesate de câștigători, sunt disponibile public [7]. Soluții de vârf: formulare MIP pe graf [19] și matheuristică paralelizată [20].
- **ITC-2007 CB-CTT** (Udine) [5][6]: date reale; constrângeri soft relevante: *curriculum compactness* (lecții izolate ale unui curriculum într-o zi), *room stability*, disponibilitatea profesorilor (constrângere hard) [5][6].

## 4. Perturbarea minimă

Problema perturbării minime în orarul universitar a fost formulată pentru UniTime/Purdue: soluția nouă trebuie să fie cât mai apropiată de cea existentă după schimbări ale datelor [13][14]. Phillips et al. propun o metodă bazată pe programare în numere întregi care rezolvă fiecare infezabilitate în cea mai mică vecinătate posibilă, ca să evite mutări mari și perturbări extinse [15]. **Pentru proiect:** mutările limitate (P04) și repararea după închiderea sălii (cazul 5, D19) sunt instanțe ale acestei probleme; contribuția nu poate fi „perturbarea minimă” ca atare.

## 5. Analogii utile din alte domenii

- **Room committing în hoteluri (RoomTetris)** [18]: rezervările de mai multe nopți trebuie să stea în aceeași cameră; unele sunt „fixate” (*pinned*), celelalte „libere” și pot fi permutate ca să elibereze camere continue pentru rezervări lungi. Este analogul cel mai apropiat al combinației „bloc în aceeași sală + rezervări fixate/mutabile + permutări” din RoomAllocation (și din TableFlow). Diferența: camerele de același tip sunt interschimbabile, pe când sălile diferă ca tip, capacitate și echipamente (raritatea).
- **Potrivirea online cu înlocuiri** [17]: fundament teoretic pentru mutări (§2).

## 6. Compactarea orarului (fără „ferestre” între perechi) — ideea coordonatorului din 14.11.2026

- **Formulări existente.** CB-CTT penalizează lecțiile izolate ale unui curriculum [5][6]; ITC 2019 are `MaxBreaks` și `MaxBlock` [9]; formatul XHSTT pentru orarul școlar are constrângerea *Limit Idle Times*, care limitează orele libere dintre lecții pentru o resursă (clasă sau profesor) [21][22][23].
- **Sistemele pe grupe fixe seamănă cu orarul școlar.** Literatura XHSTT notează că țările diferă tocmai prin compactarea cerută pentru elevi și că, atunci când profesorii sunt prealocați, orarele fără ore libere și pentru elevi, și pentru profesori sunt foarte greu de obținut [22]. Structura flux → grupă → subgrupă (D21) este mai apropiată de această situație decât modelul pe înscrieri individuale.
- **Compactarea se decide la alegerea orei, nu a sălii.** Vermuyten et al. construiesc orare compacte în două etape: întâi orele și sălile (preferințe), apoi realocarea sălilor pentru fluxurile de studenți; motivația include preferința studenților pentru orare compacte și evitarea zilelor cu o singură lecție [24]. Cu orele fixate, alegerea sălii nu poate reduce ferestrele; este nevoie ca cererea să aibă **mai multe perechi acceptabile** (P11).
- **Pentru proiect:** reducerea ferestrelor este o temă bine cunoscută a orarului complet; varianta online — alegerea perechii din intervalul declarat de profesor, ținând cont de orarul existent al grupei — trebuie verificată mai atent în literatură înainte de orice afirmație.

## 7. Măsurarea utilizării spațiului

Utilizarea sălilor se măsoară de regulă prin **frecvență** (ore folosite / ore disponibile) și **ocupare** (locuri ocupate / capacitate când sala e folosită), iar utilizarea este produsul lor [25]. Sunt indicatori naturali pentru datele reale (P16) și completează „locurile neocupate” din simulatorul V0.

## 8. Date reale și protecția datelor

- Instanțele ITC 2019 [8][9] și CB-CTT [5] sunt date reale, publice, folosibile pentru validare (D24), după adaptare (orele fixate pentru alocarea sălilor).
- Pentru datele unei universități din Republica Moldova se aplică Legea nr. 133/2011 privind protecția datelor cu caracter personal [26]; legea definește depersonalizarea datelor. Sălile, grupele și mărimile lor nu sunt date personale; numele profesorilor sunt. Implicație: profesorii se pseudonimizează în repository, iar corespondența (dacă e necesară) se păstrează în afara Git.

## 9. Poziționare (ipoteze de lucru)

**Ce există deja și nu poate fi revendicat:** alocarea sălilor cu orele fixate (inclusiv IP la scară mare [12]); perturbarea minimă [13]–[15]; sisteme complete de orar cu evenimente [10]; compactarea ca obiectiv al orarului [5][9][21]; reasignările limitate ca idee generală [17][18].

**Unde poate sta contribuția (de verificat în continuare):**
1. Modul **online, per cerere**, cu explicația deciziei și refuz motivat cu alternative, pentru rezervările suplimentare peste orarul existent (scenariul de pilot P15).
2. Combinația evaluată reproductibil: coeziunea blocului (stabilitate pe perioade contigue) + raritatea sălilor + mutări limitate, cu comparația **prevenire (raritate) vs. reparare (mutări)** — rezultatele preliminare din `results.md` §3 sugerează că prevenirea reduce mult nevoia de mutări.
3. Dacă se adoptă P17: alegerea perechii din intervalul profesorului cu minimizarea ferestrelor grupei, **online**, comparată cu optimul offline (Î3) — o legătură explicită între alocarea sălilor și compactarea orarului.

**Ce trebuie evitat în formulări:** „algoritm nou de mutări”, „primul sistem care…”, „rezolvă problema NP-dificilă”.

**Benchmark-uri pentru V1:** ITC 2019 (cu orele din soluțiile publicate, pentru alocarea sălilor) și CB-CTT; comparația cu un solver exact (P08) pe instanțe mici.

**De citit integral în continuare:** [1], [3], [12], [15], [18], [9] (secțiunile despre constrângerile de distribuție), [24], plus o căutare țintită pe „online/interactive timetabling with time windows” și „student idle time” în orarul universitar.

## 10. Bibliografie

1. Carter, M. W., Tovey, C. A. (1992). When is the classroom assignment problem hard? *Operations Research*, 40(1-supplement-1), S28–S39. https://doi.org/10.1287/opre.40.1.S28
2. Schaerf, A. (1999). A survey of automated timetabling. *Artificial Intelligence Review*, 13(2), 87–127.
3. Lach, G., Lübbecke, M. E. (2012). Curriculum based course timetabling: new solutions to Udine benchmark instances. *Annals of Operations Research* (online 2010). https://doi.org/10.1007/s10479-010-0700-7 ◐
4. Lach, G., Lübbecke, M. E. (2008). Optimal university course timetables and the partial transversal polytope. PDF: https://www.or.rwth-aachen.de/files/research/publications/tuberlin.pdf ◐
5. Di Gaspero, L., McCollum, B., Schaerf, A. (2007). The Second International Timetabling Competition (ITC-2007): Curriculum-based Course Timetabling (Track 3). Technical report. https://www.eeecs.qub.ac.uk/eventmap/curriculmcourse/report/curriculumtechreport.pdf
6. McCollum, B. et al. (2010). Setting the research agenda in automated timetabling: The Second International Timetabling Competition. *INFORMS Journal on Computing*, 22(1), 120–130. https://doi.org/10.1287/ijoc.1090.0320 ◐
7. Ceschia, S., Di Gaspero, L., Schaerf, A. (2023). Educational timetabling: Problems, benchmarks, and state-of-the-art results. *European Journal of Operational Research*, 308(1), 1–18. https://doi.org/10.1016/j.ejor.2022.07.011 (preprint: https://arxiv.org/abs/2201.07525) ◐
8. Müller, T., Rudová, H., Müllerová, Z. (2018). University course timetabling and International Timetabling Competition 2019. *Proceedings of PATAT 2018*, 5–31. ◐
9. Müller, T., Rudová, H., Müllerová, Z. (2025). Real-world university course timetabling at the International Timetabling Competition 2019. *Journal of Scheduling*, 28(2), 247–267. https://doi.org/10.1007/s10951-023-00801-w ◐
10. Rudová, H., Müller, T., Murray, K. (2011). Complex university course timetabling. *Journal of Scheduling*, 14(2), 187–207. https://doi.org/10.1007/s10951-010-0171-3 ◐ — Documentația UniTime: https://help.unitime.org
11. Bettinelli, A., Cacchiani, V., Roberti, R., Toth, P. (2015). An overview of curriculum-based course timetabling. *TOP* (2015). https://doi.org/10.1007/s11750-015-0366-z ◐
12. Phillips, A. E., Waterer, H., Ehrgott, M., Ryan, D. M. (2015). Integer programming methods for large-scale practical classroom assignment problems. *Computers & Operations Research*, 53, 42–53. https://doi.org/10.1016/j.cor.2014.07.012 ◐
13. Barták, R., Müller, T., Rudová, H. (2004). A new approach to modeling and solving minimal perturbation problems. *Recent Advances in Constraints*, Springer, 233–249. ◐
14. Müller, T., Rudová, H., Barták, R. (2005). Minimal perturbation problem in course timetabling. *PATAT V*, LNCS 3616, 126–146. https://doi.org/10.1007/11593577_8 ◐
15. Phillips, A. E., Walker, C. G., Ehrgott, M., Ryan, D. M. (2017). Integer programming for minimal perturbation problems in university course timetabling. *Annals of Operations Research*, 252(2), 283–304. https://doi.org/10.1007/s10479-015-2094-z ◐
16. Lipton, R. J., Tomkins, A. (1994). Online interval scheduling. *Proceedings of SODA 1994*. ◐
17. Bernstein, A., Holm, J., Rotenberg, E. (2019). Online bipartite matching with amortized O(log² n) replacements. *Journal of the ACM*, 66(5), 37. https://doi.org/10.1145/3344999 ◐
18. Battiti, R., Brunato, M., Battiti, F. (2021). RoomTetris in room committing: why the role of minimum-length-of-stay requirements should be revisited. *International Journal of Contemporary Hospitality Management*, 33(11). https://doi.org/10.1108/IJCHM-11-2020-1364 ◐
19. Holm, D. S., Mikkelsen, R. Ø., Sørensen, M., Stidsen, T. J. R. (2022). A graph-based MIP formulation of the International Timetabling Competition 2019. *Journal of Scheduling*, 25(4), 405–428. ◐
20. Mikkelsen, R. Ø., Holm, D. S. (2022). A parallelized matheuristic for the International Timetabling Competition 2019. *Journal of Scheduling*, 25(4), 429–452. ◐
21. Post, G., Di Gaspero, L., Kingston, J. H., McCollum, B., Schaerf, A. (2016). The Third International Timetabling Competition. *Annals of Operations Research*, 239(1), 69–75. ◐
22. Post, G. et al. (2012). An XML format for benchmarks in high school timetabling. *Annals of Operations Research*, 194, 385–397. https://doi.org/10.1007/s10479-010-0699-9 ◐
23. Post, G. et al. (2014). XHSTT: an XML archive for high school timetabling problems in different countries. *Annals of Operations Research*, 218, 295–301. https://doi.org/10.1007/s10479-011-1012-2 ◐
24. Vermuyten, H., Lemmens, S., Marques, I., Beliën, J. (2016). Developing compact course timetables with optimized student flows. *European Journal of Operational Research*, 251(2), 651–661. https://doi.org/10.1016/j.ejor.2015.11.028 ◐
25. Definițiile frecvenței, ocupării și utilizării (NAO, 1996), preluate în studiile de utilizare a spațiului universitar, de exemplu TU Delft: *Property Management*, 39(4), 441. https://www.emerald.com/pm/article/39/4/441/317647 ◐
26. Legea nr. 133 din 08.07.2011 privind protecția datelor cu caracter personal (Republica Moldova), Monitorul Oficial nr. 170–175, art. 492.
