// Wygenerowane przez scripts/ects-program.ts z Katalogu ECTS PW (2021/2022) - nie edytować ręcznie.
import type { StudyProgram } from '../studyProgram'

export const PROGRAM: StudyProgram = {
 "id": 2247,
 "name": "Inżynieria Biomedyczna",
 "faculty": "Wydział Elektroniki i Technik Informacyjnych",
 "degree": "inż",
 "mode": "Stacjonarne",
 "year": "2021/2022",
 "url": "https://ects.pw.edu.pl/menu2/detail2test/idProgram/2247/idWydzial/4/idStopien/1",
 "semesters": [
  {
   "number": 1,
   "courses": [
    {
     "name": "HES sem. 1",
     "block": "HES",
     "group": "HES",
     "ects": 2,
     "hours": {
      "W": 30
     },
     "syllabusId": 900280,
     "code": "HES1",
     "exam": false
    },
    {
     "name": "Anatomia i fizjologia",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 3,
     "hours": {
      "W": 30
     },
     "syllabusId": 900256,
     "code": "ANiF",
     "coordinator": "Prof. dr hab. Bogdan CISZEK",
     "exam": false,
     "prerequisites": "WYKŁAD: brak wymagań wstępnych\nPROJEKTOWANIE: opanowanie materiału z wykładu",
     "goal": "Zapoznanie studentów z podstawami anatomii i fizjologii człowieka.",
     "content": "WYKŁAD: Budowa ciała - Budowa zewnętrzna i wewnętrzna ciała ludzkiego. Części składowe. (5h) Komórki, tkanki i ich czynności - Dializa. Transport jonowy, wymiana gazowa, potencjały elektryczne w organizmie. (8h) Narządy wewnętrzne i układy narządów (położenie, budowa i funkcje) – Układ szkieletowy (kości, więzadła, stawy), układ mięśniowy (mięśnie prążkowane i gładkie, układ oddechowy (płuca, drogi oddechowe), układ pokarmowy (przełyk, żołądek, jelita), wątroba, trzustka, układ moczowy (nerka, pęcherz moczowy), układ nerwowy (mózg, rdzeń kręgowy, nerwy obwodowe, zwoje i sploty nerwowe). (10h) Układ krążenia i krew (budowa i funkcje) – Układ krążenia (serce, naczynia wieńcowe, naczynia obwodowe), krew, układ krwiotwórczy, właściwości fizykochemiczne krwi. (5h) Wybrane zagadnienia - Wybrane zagadnienia histologii i embriologii. (2h),",
     "assessment": "kolokwia",
     "literature": "W. Sylwanowicz, Anatomia człowieka, PZWL,Warszawa 1977;\nBochenek, Anatomia człowieka, PZWL Warszawa, 1990 W. Traczyk i A. Trzebski, Fizjologia człowieka z elementami fizjologii klinicznej. Wyd. 3, PZWL Warszawa, 2001"
    },
    {
     "name": "Metrologia",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 5,
     "hours": {
      "W": 30,
      "L": 30
     },
     "syllabusId": 900260,
     "code": "MRL",
     "coordinator": "dr inż. Jacek Dusza",
     "exam": true,
     "prerequisites": "Zaliczony jeden semestr analizy matematycznej",
     "goal": "Zapoznanie z podstawami wiedzy o sygnałach, elementach i obwodach elektrycznych oraz sygnałach biomedycznych\n- Wyrobienie umiejętności organizacji doświadczeń pomiarowych, łączenia obwodów pomiarowych i posługiwania się podstawową aparaturą laboratorium elektronicznego.\n- Nabycie umiejętności prawidłowego dokumentowania wyników doświadczeń.\n- Nauczenie sposobów oceny błędów pomiarowych\ni świadomego wyboru metod prowadzących do ich minimalizacji.",
     "content": "Treść wykładu: - Wprowadzenie: podstawowe pojęcia metrologiczne, przyrządy pomiarowe. - Podstawy elektrotechniki teoretycznej w zakresie sygnałów i obwodów elektrycznych. - Podstawy wiedzy o pomiarach i błędach pomiarowych. - Wyposażenie stanowiska laboratoryjnego. - Pomiary parametrów sygnałów. - Pomiary parametrów elementów biernych. - Informacje o sposobach rejestracji i analizy sygnałów biomedycznych Tematyka laboratorium: - Aparatura pomiarowa: źródła sygnałów, multimetry cyfrowe. - Aparatura pomiarowa: oscyloskop elektroniczny. - Pomiary napięć stałych. - Pomiary parametrów napięć zmiennych.- Pomiary częstotliwości i czasu. - Pomiary parametrów elementów biernych (rezystora, kondensatora i cewki indukcyjnej).",
     "assessment": "Kolokwium poświęcone analizie błędów oraz końcowe kolokwium zaliczające przedmiot.\nOcena z pracy laboratoryjnej.",
     "literature": "Literatura:\n[1] Dusza J., Gortat G., Leśniewski A.: „Podstawy miernictwa\", Oficyna Wydawnicza Politechniki Warszawskiej, 2007.\n[2] Jędrzejewski K. (red):\"Laboratorium podstaw pomiarów\", Oficyna Wydawnicza Politechniki Warszawskiej, 2007.\n[3] Osiowski J., Szabatin J.: „Podstawy teorii obwodów\", t. I i II, WNT, 1998."
    },
    {
     "name": "Propedeutyka medycyny",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 2,
     "hours": {
      "W": 15,
      "C": 15
     },
     "syllabusId": 900258,
     "code": "PROM",
     "coordinator": "prof. dr hab. inż. Gerard Cybulski",
     "exam": false,
     "prerequisites": "Ogólna wiedza biologiczno-przyrodnicza na poziomie liceum ogólnokształcącego.",
     "goal": "Poznanie zagadnień medycznych potrzebnych do projektowania, konstruowania i umiejętności poprawnej eksploatacji urządzeń elektromedycznych.",
     "content": "Wykłady obejmują następujące zagadnienia:\n• Wprowadzenie: pojęcie zdrowia i choroby. Człowiek chory. Godność człowieka (pacjenta, lekarza, inżyniera). Organizacja służby zdrowia. Specjalności lekarskie. Problemy etyczne w służbie zdrowia. Uwarunkowania etyczne i prawne związane z transplantacją i inżynierią genetyczną.\n• Higiena ogólna i szpitalna, Źródła i drogi infekcji. Dezynfekcja i sterylizacja. Antyseptyka i aseptyka. Uszkodzenia jatrogenne.\n• Diagnostyka: Badania podmiotowe i przedmiotowe (fizykalne i dodatkowe).\n• Leczenie: Metody - przyczynowe, objawowe, substytucyjne, paliatywne. Zapobieganie chorobom. Chirurgia ogólna i specjalistyczna\n• Medycyna oparta na dowodach medycznych (Evidence based medicine)\n• Regulacje prawne dotyczące urządzeń medycznych. Zagadnienia ryzyka elektrycznego, mechanicznego i radiacyjnego. Systemy kontroli jakości, akredytacja laboratoriów (pracowni).\n• Normy i standardy obowiązujące w inżynierii biomedycznej.\n\nW czasie ćwiczeń audytoryjnych studenci będą prezentować wybrane działy medycyny koncentrując się na następujących zagadnieniach: historia specjalności, najbardziej rozpowszechnione choroby, stosowane metody diagnostyczne i terapeutyczne ze szczególnym uwzględnieniem urządzeń elektromedycznych.",
     "assessment": "test końcowy i prezentacja zagadnienia medycznego",
     "literature": "• G Pawlicki: Podstawy inżynierii biomedycznej. OW.PW, Warszawa, 1995.\n• RW Gutt. Propedeutyka Medycyny. PZWL, 1982\n• R. Fenigsen. Przysięga Hipokratesa. Rozważania o etyce i eutanazji. Świat Książki. 2010\n• W. Sylwanowicz, Anatomia człowieka, PZWL, Warszawa 1977.\n• B. Jacobson, J. Webster, Medicine and Clinical Engineering, Prentice – Hall, New-Jersey, USA, 1977.\n• PC Hayes, TW Mackay. Vademecum Medycyny, ViaMedica, 1995"
    },
    {
     "name": "Podstawy programowania",
     "block": "Ogólne",
     "group": "Obowiązkowe",
     "ects": 3,
     "hours": {
      "W": 15,
      "L": 15
     },
     "syllabusId": 900244,
     "code": "PTIB",
     "coordinator": "Dr inż. Robert KURJATA",
     "exam": false,
     "goal": "Celem przedmiotu jest uzupełnienie wiedzy studentów w zakresie podstawowych technik informatycznych, budowy komputerów, zasad ich działania, podstaw sieci teleinformatycznych oraz zasad bezpiecznej pracy. Studenci nabędą także sprawność posługiwania się podstawowymi narzędziami informatycznymi w postaci pakietów biurowych, przeglądarek sieci WWW, poczty elektronicznej. Celem przedmiotu jest uzyskanie poziomu umiejętności praktycznych odpowiadających certyfikatowi ECDL.",
     "content": "Wykład:\n1. Podstawy działania komputerów: Rodzaje komputerów, ich budowa oraz zasady działania poszczególnych podzespołów komputerów.\n2. Oprogramowanie komputerów: Rodzaje oprogramowania, systemy operacyjne i ich znaczenie, proces powstawania oprogramowania.\n3. Sieci komputerowe: Sieci komputerowe, podział i zasady działania.\n4. Człowiek i komputery: Komputery w życiu codziennym, bezpieczeństwo pracy, wpływ komputerów na środowisko.\n5. Bezpieczeństwo danych: Bezpieczeństwo danych, wirusy komputerowe i złośliwe oprogramowanie.\n6. Prawo a komputery: Wybrane zagadnienia prawne w zakresie prawa autorskiego i ochrony danych osobowych.\n\nLaboratorium:\n1. Podstawy pracy w środowisku graficznym: Podstawy obsługi środowiska graficznego, podstawowe zasady poruszania się oraz lokalizacja i konfiguracja niezbędnych elementów środowiska.\n2. Przetwarzanie tekstu: Podstawy tworzenia i formatowania dokumentów tekstowych.\n3. Arkusz kalkulacyjny: Podstawy tworzenia arkuszy kalkulacyjnych, tworzenie formuł i wykresów.\n4. Bazy danych: Podstawy baz danych, tworzenie prostych relacji i zapytań.\n5. Grafika menedżerska i prezentacyjna: Tworzenie prezentacji, formatowanie, animacje, osadzanie obiektów multimedialnych.\n6. Usługi w sieciach informatycznych: Podstawy wykorzystania sieci Internet w pracy: poczta elektroniczna, wyszukiwarki, grupy dyskusyjne. Podstawowe zasady bezpiecznych zachowań w sieci.",
     "assessment": "Na ocenę końcową składają się:\nocena z kolokwium (waga 0,4)\nocena z laboratorium (waga 0,6)",
     "literature": "1. W. Sikorski, M. Kopertowska, A. Wojciechowski, Z. Nowakowski: Europejski Certyfikat Umiejętności Komputerowych. T. 1-7, MIKOM 2006;\n2. P. Waglowski: Prawo w sieci. Zarys regulacji internetu, HELION, 2005;\n3. P. Metzger: Anatomia PC. Wydanie X, HELION, 2006."
    },
    {
     "name": "Fizyka 1",
     "block": "Podstawowe",
     "group": "Obowiązkowe",
     "ects": 6,
     "hours": {
      "W": 30,
      "C": 15,
      "L": 15
     },
     "syllabusId": 900246,
     "coordinator": "prof. dr hab. Jan J. Żebrowski",
     "exam": true,
     "prerequisites": "Matematyka – Algebra liniowa i analiza",
     "goal": "Zapoznanie studentów z podstawami fizyki\nw zakresie mechaniki klasycznej oraz elektro-dynamiki i optyki w zakresie typowym dla uniwersytetu technicznego ze szczególnym uwzględnieniem potrzeb Kierunku Inżynierii Biomedycznej w zakresie rozwiązywania prostych zadań technicznych. W wykładzie podkreśla się uniwersalność i interdyscyplinarność praw fizyki, eksponuje jej doświadczalny charakter i elementy współczesnego naukowego obrazu przyrody.",
     "content": "Wstęp: Istota i struktura fizyki Mechanika : Opis ruchu układu fizycznego. Zasady dynamiki Newtona. Równania ruchu. Zasady zachowania pędu, momentu pędu i energii. Siły zachowawcze i nie zachowawcze; zasada zachowania energii. Ruch drgający. Rezonans układów drgających. Ruch falowy. Równania ruchu falowego. Elementy akustyki. Efekt Dopplera. Przyczynowość równań ruchu. Zjawiskanieliniowe w ruch drgającym i falowym. Elementy mechaniki elatywistycznej. Elementy statyki i dynamiki płynów (2h) Elektrodynamika : Pole elektryczne. Prawo Coulomba. Natężenie i potencjał pola elektrycznego. Prawo Gaussa. Równanie Poissonai Laplacea. Pole elektryczne w dielektryku(zjawisko polaryzacji dielektrycznej). Pole magnetyczne. Siła Lorentza. Prawo Ampere'a dla prądów stałych i dla prądów zmiennych. Prawo indukcji Faradaya. Indukcyjność. Prawo Biot-Savarta. Równania Maxwella (postać różniczkowa i całkowa, interpretacja). Równania materiałowe.Równanie Poissona. Dyspersja fal elektromagnetycznych. Optyka: Optyka falowa\ni geometryczna. Polaryzacja. Interferencja fal. Dyfrakcja i jej rodzaje. Elementy transformacji optycznych, związek dyfrakcji z transformatą Fouriera. Holografia. Mikroskop elektronowy i zasady rentgenografii.",
     "assessment": "Kolokwium wykładowe w połowie semestru - ocena uwzględniana w ocenie egzaminacyjnej;\nOcena z egzaminu;\nDwa kolokwia na ćwiczeniach;\nKolokwium przed każdym ćwiczeniem laboratoryjnym oraz ocena sprawozdania z wykonania ćwiczeń laboratoryjnych.",
     "literature": "Podręczniki wykładowe: I.W. Sawieliew, Wykłady z fizyki, t.1 Mechanika i fizyka cząsteczkowa; t.2 Elektryczność i magnetyzm, fale, optyka. Wyd. Naukowe PWN Warszawa 1997.\nW. Bogusz, J. Garbarczyk, F. Krok, Podstawy Fizyki, Oficyna Wydawnicza Politechniki Warszawskiej, Warszawa 1997, 1999.\nC. Kittel, W. Knight, M. Ruderman, Mechanika; F. C. Crawford: Fale, PWN, 1973;\nE.Purcell, Elektrodynamika, Wyd. Naukowe PWN Warszawa 1969.\nZbiory zadań: A.Hennel, W.Szuszkiewicz, Zadania i problemy z fizyki, WNT 2002 M.\nBaj, G. Szeflińska, M. Szymański, D. Wasik, Zadania i problemy z fizyki. Drgania i fale skalarne, PWN, Warszawa 1993.\nM. Baj, G. Szeflińska, M. Szymański, D. Wasik, Zadania i problemy z fizyki. Fale elektromagnetyczne. Fale materii, PWN, Warszawa 1996.\nW.Brański, M.Herman, L.Widomski, Zbiór zadań z fizyki -Elektryczność i magnetyzm, PWN 1979 lub późniejsze wznowienia."
    },
    {
     "name": "Matematyka - Algebra liniowa",
     "block": "Podstawowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "hours": {
      "W": 45,
      "C": 30
     },
     "syllabusId": 900252,
     "code": "ALL",
     "coordinator": "doc. dr E. Stankiewicz-Wiechno",
     "exam": true,
     "prerequisites": "znajomość matematyki na poziomie szkoły średniej",
     "goal": "Zapoznanie studentów z podstawową wiedzą z zakresu rachunku różniczkowego funkcji jednej i wielu zmiennych, rachunku całkowego funkcji jednej zmiennej, równań różniczkowych zwyczajnych; - ukształtowanie umiejętności rozwiązywania zadań rachunkowych oraz problemów związanych z omawianymi zagadnieniami",
     "content": "Treść wykładu : 1. Liczby zespolone (4h) – postać kanoniczna, trygonometryczna i wykładnicza, wzór Moivre’a i wzór Eulera; - pierwiastkowanie liczb zespolonych; - wielomiany, zasadnicze twierdzenie algebry. 2. Wstęp do algebry liniowej (6h) - macierze\ni wyznaczniki; - macierz odwrotna, rząd macierzy; - układy równań liniowych i metody ich rozwiązywania. 3. Wprowadzenie do analizy matematycznej (3h) - powtórzenie i uzupełnienie ogólnych wiadomości\no funkcjach; - definicje i podstawowe własności niektórych funkcji elementarnych: f. cyklometryczne, f. hiperboliczne. 4. Rachunek różniczkowy funkcji jednej zmiennej (10h) - granica ciągu liczbowego, twierdzenia\no ciągach; - granica funkcji w punkcie, granice funkcji\nw nieskończoności; - ciągłość funkcji liczbowych; - pochodna funkcji, różniczka, wzory na pochodne, pochodne wyższych rzędów; -twierdzenia o pochodnych (tw.de l’Hospitala, tw.Rolle’a i Lagrange’a, wzór Taylora). 5. Rachunek całkowy funkcji jednej zmiennej (10h) -całka nieoznaczona, całkowanie przez części i przez podstawienie; - całka oznaczona Riemanna, interpretacje i własności; - geometryczne zastosowania całki Riemanna (obliczanie pól figur płaskich, objętości brył obrotowych); - całki niewłaściwe I i II rodzaju. 6. Wprowadzenie do rachunku różniczkowego funkcji wielu zmiennych (6h) - zbieżność w przestrzeni Rn ; - granica i ciągłość funkcji wielu zmiennych; - pochodne cząstkowe, gradient funkcji, funkcja uwikłana; -ekstrema funkcji wielu zmiennych. 7. Wstęp do równań różniczkowych zwyczajnych (6h) -wiadomości wstępne; - równania o zmiennych rozdzielonych, równania liniowe I rzędu; -równania liniowe II rzędu o stałych współczynnikach. Zakres ćwiczeń: 1. Działania na liczbach zespolonych, rozwiązywanie równań algebraicznych w dziedzinie zespolonej (4h) 2. Obliczanie wyznaczników, rozwiązywanie układów równań liniowych metodami poznanymi na wykładzie (4h) 3. Badanie własności funkcji elementarnych.(2h) 4. Obliczanie granic ciągów i funkcji jednej zmiennej, badanie ciągłości funkcji.(4h) 5. Obliczanie pochodnych funkcji jednej zmiennej z definicji i ze wzorów; zastosowanie pochodnych do badania własności funkcji jednej zmiennej; aproksymowanie funkcji wielomianami; wyznaczanie wartości przybliżonych i wartości błędu bezwzględnego.(5h) 6. Obliczanie całeknieoznaczonych z zastosowaniem metody całkowania przez części i całkowania przez podstawienie.(4h) 7. Obliczanie całek oznaczonych, obliczanie pól obszarów płaskich i objętości powierzchni obrotowych.(2h) 8. Obliczanie całek niewłaściwych I - go i II – go rodzaju. (2h) 9. Obliczanie pochodnych cząstkowych; wyznaczanie ekstremów lokalnych funkcji dwóch zmiennych.(3h)",
     "assessment": "egzamin",
     "literature": "Literatura podstawowa: 1. J.Klukowski, I.Nabiałek, Algebra dla studentów, WNT 2. W.Żakowski, G.Decewicz, Matematyka I, WNT 3. W.Żakowski, W.Kołodziej, Matematyka II, WNT\nLiteratura uzupełniająca: 1. J.Laszuk, Zbiór zadań zmatematyki 2. W.Leksiński, I.Nabiałek, W.Żakowski, Matematyka zadania, WNT"
    },
    {
     "name": "Matematyka - Analiza I",
     "block": "Podstawowe",
     "group": "Obowiązkowe",
     "ects": 3,
     "hours": {
      "W": 45,
      "C": 30
     },
     "syllabusId": 900254,
     "coordinator": "doc. dr E. Stankiewicz-Wiechno",
     "exam": true,
     "prerequisites": "znajomość matematyki na poziomie szkoły średniej",
     "goal": "Zapoznanie studentów z podstawową wiedzą z zakresu rachunku różniczkowego funkcji jednej i wielu zmiennych, rachunku całkowego funkcji jednej zmiennej, równań różniczkowych zwyczajnych; - ukształtowanie umiejętności rozwiązywania zadań rachunkowych oraz problemów związanych z omawianymi zagadnieniami",
     "content": "Treść wykładu : 1. Liczby zespolone (4h) – postać kanoniczna, trygonometryczna i wykładnicza, wzór Moivre’a i wzór Eulera; - pierwiastkowanie liczb zespolonych; - wielomiany, zasadnicze twierdzenie algebry. 2. Wstęp do algebry liniowej (6h) - macierze\ni wyznaczniki; - macierz odwrotna, rząd macierzy; - układy równań liniowych i metody ich rozwiązywania. 3. Wprowadzenie do analizy matematycznej (3h) - powtórzenie i uzupełnienie ogólnych wiadomości\no funkcjach; - definicje i podstawowe własności niektórych funkcji elementarnych: f. cyklometryczne, f. hiperboliczne. 4. Rachunek różniczkowy funkcji jednej zmiennej (10h) - granica ciągu liczbowego, twierdzenia\no ciągach; - granica funkcji w punkcie, granice funkcji\nw nieskończoności; - ciągłość funkcji liczbowych; - pochodna funkcji, różniczka, wzory na pochodne, pochodne wyższych rzędów; -twierdzenia o pochodnych (tw.de l’Hospitala, tw.Rolle’a i Lagrange’a, wzór Taylora). 5. Rachunek całkowy funkcji jednej zmiennej (10h) -całka nieoznaczona, całkowanie przez części i przez podstawienie; - całka oznaczona Riemanna, interpretacje i własności; - geometryczne zastosowania całki Riemanna (obliczanie pól figur płaskich, objętości brył obrotowych); - całki niewłaściwe I i II rodzaju. 6. Wprowadzenie do rachunku różniczkowego funkcji wielu zmiennych (6h) - zbieżność w przestrzeni Rn ; - granica i ciągłość funkcji wielu zmiennych; - pochodne cząstkowe, gradient funkcji, funkcja uwikłana; -ekstrema funkcji wielu zmiennych. 7. Wstęp do równań różniczkowych zwyczajnych (6h) -wiadomości wstępne; - równania o zmiennych rozdzielonych, równania liniowe I rzędu; -równania liniowe II rzędu o stałych współczynnikach. Zakres ćwiczeń: 1. Działania na liczbach zespolonych, rozwiązywanie równań algebraicznych w dziedzinie zespolonej (4h) 2. Obliczanie wyznaczników, rozwiązywanie układów równań liniowych metodami poznanymi na wykładzie (4h) 3. Badanie własności funkcji elementarnych.(2h) 4. Obliczanie granic ciągów i funkcji jednej zmiennej, badanie ciągłości funkcji.(4h) 5. Obliczanie pochodnych funkcji jednej zmiennej z definicji i ze wzorów; zastosowanie pochodnych do badania własności funkcji jednej zmiennej; aproksymowanie funkcji wielomianami; wyznaczanie wartości przybliżonych i wartości błędu bezwzględnego.(5h) 6. Obliczanie całeknieoznaczonych z zastosowaniem metody całkowania przez części i całkowania przez podstawienie.(4h) 7. Obliczanie całek oznaczonych, obliczanie pól obszarów płaskich i objętości powierzchni obrotowych.(2h) 8. Obliczanie całek niewłaściwych I - go i II – go rodzaju. (2h) 9. Obliczanie pochodnych cząstkowych; wyznaczanie ekstremów lokalnych funkcji dwóch zmiennych.(3h)",
     "assessment": "egzamin",
     "literature": "Literatura podstawowa: 1. J.Klukowski, I.Nabiałek, Algebra dla studentów, WNT 2. W.Żakowski, G.Decewicz, Matematyka I, WNT 3. W.Żakowski, W.Kołodziej, Matematyka II, WNT\nLiteratura uzupełniająca: 1. J.Laszuk, Zbiór zadań zmatematyki 2. W.Leksiński, I.Nabiałek, W.Żakowski, Matematyka zadania, WNT"
    },
    {
     "name": "Materiałoznawstwo",
     "block": "Podstawowe",
     "group": "Obowiązkowe",
     "ects": 2,
     "hours": {
      "W": 30
     },
     "syllabusId": 900248,
     "code": "MTZ",
     "coordinator": "prof. nzw. dr hab.inż. Jarosław Mizera",
     "exam": true,
     "goal": "Celem przedmiotu jest zapoznanie studentów z głównymi zagadnieniami dotyczącymi materiałów oraz związaną z tym terminologią oraz z zasadami doboru materiałów do zastosowań biomedycznych pod kątem kształtowania ich struktury i właściwości.",
     "content": "Podstawy krystalografii - Klasyfikacja ciał stałychpod względem ich budowy - struktury. Podstawy opisu budowy ciał krystalicznych (4h). Struktura materiałów. Poziomy rozpatrywania struktury, mikrostruktura, możliwości kształtowania struktury. Badania struktury(4h). Właściwości materiałów. Właściwości mechaniczne, cieplne, elektryczne, magnetyczne, optyczne, biologiczne. Poziomy struktury odpowiedzialne za właściwości materiałów. Metody badania właściwości materiałów (4h). Zależność między strukturą a właściwościami materiałów. Rola różnych grup materiałów w technice. Główne czynniki wpływające na zastosowania poszczególnych materiałów. Podstawowe zasady doboru materiałów do różnych zastosowań(4h). Klasyfikacja materiałów. Metale i ich stopy, materiały ceramiczne, tworzywa sztuczne, kompozyty. Charakterystyka podstawowych grup tworzyw metalicznych. Charakterystyka wybranych tworzyw ceramicznych. Kompozyty o osnowie polimerowej, metalicznej i ceramicznej. Materiały amorficzne, mono- i poli-krystaliczne. Materiały nanokrystaliczne. Materiały z gradientem struktury. Warstwy i powłoki. Układy zdyspergowane(4h). Technologie materiałowe. Odlewanie. Obróbka ubytkowa. Przeróbka plastyczna. Przegląd współczesnych technik wytwarzania. Łączenie materiałów. Inżynieria powierzchni(4h). Zastosowanie materiałów w medycynie i inżynierii biomedycznej. Implanty. Sztuczne narządy. Inżynieria tkankowa. Wymagania stawiane materiałom stosowanym w medycynie i inżynierii biomedycznej oraz metody oceny ich właściwości(4h).",
     "assessment": "Kolokwia",
     "literature": "M.W. Grabski, J.A. Kozubowski Inżynieria Materiałowa: geneza, istota, perspektywy. Oficyna Wydawnicza PW 2003,\nS. Prowans, Struktura stopów, - PWN 2000; Metaloznawstwo, pod red. F.Stauba, Śląskie Wydawnictwo Techniczne 1994;\nL.A. Dobrzański, Metaloznawstwo z podstawami nauki o materiałach, WNT 1996; M.F. Ashby, D.R.H. Jones, Materiały Inżynierskie, Tom 1 i 2, WNT 1996."
    },
    {
     "name": "Szkolenie BHP",
     "block": "Szkolenia",
     "group": "Szkolenia",
     "ects": 0,
     "syllabusId": 900305,
     "coordinator": "specjalista BHP",
     "exam": false,
     "goal": "Zapoznanie z zasadami BHP, w szczególności w warunkach wyższej uczelni technicznej",
     "content": "Informacje o zagrożeniach, zasady pierwszej pomocy, zachowanie bezpieczeństwa w pomieszczeniach dydaktycznych",
     "assessment": "test"
    }
   ]
  },
  {
   "number": 2,
   "courses": [
    {
     "name": "HES sem.2",
     "block": "HES",
     "group": "HES",
     "ects": 2,
     "hours": {
      "W": 30
     },
     "syllabusId": 900281,
     "code": "HES sem.2",
     "exam": false
    },
    {
     "name": "Biomateriały",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 2,
     "hours": {
      "W": 30
     },
     "syllabusId": 900275,
     "code": "BIOMA",
     "coordinator": "prof. dr hab. inż. Tadeusz Wierzchoń",
     "exam": false,
     "prerequisites": "Wymagana ogólna znajomość zagadnień wykładanych w przedmiotach: matematyka, fizyka, znajomość zagadnień z przedmiotu Podstawy Automatyki I.",
     "goal": "Charakterystyka biomateriałów metalicznych, ceramicznych, polimerowych i kompozytowych stosowanych w medycynie. Poznanie nowoczesnych metod inżynierii powierzchni kształtujących właściwości biomateriałów. Zrozumienie zasad projektowania i doboru biomateriałów w aspekcie określonych zastosowań.",
     "content": "Definicja biomateriałów. Charakterystyka biomateriałów stosowanych w medycynie: metalicznych, ceramicznych, polimerowych, kompozytowych. Sterylizacja biomateriałów. Badania in vitro i in vivo. Nowoczesne metody inżynierii powierzchni stosowane w wytwarzaniu biomateriałów o kontrolowanej biozgodności i aktywności biologicznej. Inżynieria biomedyczna, przykłady stosowanych implantów, instrumentarium medycznego i sensorów oraz ich charakterystyka. Zasady projektowania i doboru biomateriałów w aspekcie określonych zastosowań.",
     "assessment": "2 sprawdziany w trakcie semestru",
     "literature": "J. Marciniak, Biomateriały, Wyd. Politechniki Śląskiej, Gliwice 2002;\nA. Ślósarczyk, Bioceramika hydroksyapatytowa, Polskie Towarzystwo Ceramiczne, Kraków 1997;\nD.M. Brunette, P. Tengvall i WSP., Titanium in Medicine, Springer-Verlag, Berling, Heidelberg, New York 2011;\nE. Ellingsen, S.P Lyngstadaas, Bio-implant Interface, Improving Biomaterials and Tisssue Reactions, CRC Press LLC, Boca Raton, London - New York 2003;\nBiomateriały tom IV, Biocybernetyka i inżynieria biomedyczna 2000, pod redakcją M. Nałęcza, Akademicka Oficyna Wydawnicza, EXIT, 2003;\nT. Wierzchoń, E. Czarnowska, D. Krupa, Inżynieria Powierzchni w wytwarzaniu biomateriałów tytanowych, Oficyna Wydawnicza Politechniki Warszawskiej, Warszawa 2004;\nJ. Breme, J. Kirkpatrick, R. Thull, Metallic Biomaterial Interfaces, Villey-Vch, Verlag GmbH, 2008;\nJ. F. Shackelford, Biomaterials - application of ceramics and glass materials in medicine, Trauss, Tech. Publ. Inc. USA 1998;\nM. Gierzyńska-Dolna, Biotribologia, Wyd. Politechniki Częstochowskiej, 2002;\nM.J. Jackson, Waqar Ahmed, Surface Engineered Surgical Tools and Medical Devices, Springer Science LLC, New York 2007"
    },
    {
     "name": "Fizykomedyczne podstawy inżynierii biomedycznej",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 2,
     "hours": {
      "W": 30
     },
     "syllabusId": 900262,
     "code": "BIF",
     "coordinator": "prof. dr hab. Natalia Golnik",
     "exam": false,
     "prerequisites": "Wiedza z matematyki i fizyki na poziomie inżynierskim",
     "goal": "Zapoznanie ze zjawiskami fizycznymi zachodzącymi w procesach fizjologicznych oraz czynnością tkanek, narządów i biosystemów pod kątem ich funkcjonalnego opisu oraz możliwości wspomagania utraconych funkcji lub zastąpienia urządzeniami technicznymi. Przekazanie niezbędnej wiedzy potrzebnej do opisu i analizy zjawisk oraz do projektowania, budowy i eksploatacji aparatury medycznej (diagnostycznej, terapeutycznej i rehabilitacyjnej).",
     "content": "1. Układy wielu cząstek\n2. Transport jonów przez błony i ultrafiltracja\n3. Oddziaływania międzycząsteczkowe i konformacje dużych cząsteczek biologicznych\n4. Kinetyka reakcji enzymatycznych\n5. Zjawiska towarzyszące powstawaniu i propagacji sygnałów ektrycznych w tkankach żywych\n6. Układ nerwowy i elektroencefalografia\n7. Wpływ pól zewnętrznych na organizmy żywe\n8. Układ krwionośny i elektrografia\n9. Bierne właściwości elektryczne tkanek i ich wykorzystanie w medycynie\n10. Elektrostymulacja\n11. Biofizyka zmysłów\n12. Przykłady sterowania procesami biologicznymi w organizmie.",
     "assessment": "Kolokwia",
     "literature": "1, G. Pawlicki, Podstawy inżynierii biomedycznej, Wyd. Politechniki Warszawskiej, 1994;\n2. Z. Dunajski, Biomagnetyzm, WKiŁ 1990;\n3. W. Tkaczyk, A. Trzebisk, Fizjologia człowieka z z elementami fizjologii stosowanej i klinicznej, PZWL, 1989\n4. R.K. Hobbie, Intermediate Physics for Medicine and Biology, Springer, 1997."
    },
    {
     "name": "Programowanie obiektowe",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 5,
     "hours": {
      "W": 30,
      "L": 15,
      "P": 15
     },
     "syllabusId": 900259,
     "code": "JP",
     "coordinator": "Dr inż. Jacek Kryszyn",
     "exam": false,
     "goal": "Celem przedmiotu jest przekazanie słuchaczom zasad konstruowania programów w językach strukturalnych\ni obiektowych. Języki strukturalne zostaną omówione na przykładzie języka C, a języki obiektowe na przykładzie C++. W ramach laboratorium studenci nabędą umiejętność tworzenia programów narzędziowych z graficznym interfejsem użytkownika.",
     "content": "Zakres wykładu 1. Podstawowe pojęcia: algorytm, program. Stałe: typ i wartość. Zmienne: typ, wartość, nazwa. Typy podstawowe języka C. Niejawne rzutowanie typów. Pojecie deklaracji i definicji zmiennej. Wyrażenia\ni instrukcje. Priorytety i łączność operatorów. Operatory arytmetyczne i przyrównania. Operator podstawienia. L-wartości. Operatory post- i preinkrementacji, dekrementacji. Operatory bitowe i logiczne. 2. Blok kodu, funkcja. Funkcja main z argumentami wywołania. Zmienna lokalna i globalna. Zasięg i \"żywotność\" zmiennych. Klasy zmiennych: static, auto, register, zmienne globalne. Deklaracja zmiennej jako extern. Instrukcja warunkowa if/else, switch. Instrukcja break. Instrukcje iteracyjne: for, while, do/while. Instrukcja continue. 3. Tablica. Struktura, unia. Instrukcja typedef. Pojęcie wskaźnika. Tablice a wskaźniki. \"Typ\" łańcuchowy. Operatory referencji i dereferencji. Arytmetyka wskaźników. Rzutowanie wskaźników. Przekazywanie argumentu funkcji przez wskazanie. Przekazywanie tablicy do funkcji. Dynamiczna alokacja pamięci. Funkcje malloc i free. Lista dowiązaniowa dwukierunkowa. 4. Wejście i wyjście w C. Obsługa plików. Tryby otwarcia: tekstowy i binarny. Synchronizacja zawartości strumienia i zawartości pliku. Preprocesor. 5. Sprawdzian 1 (20 pkt) 6. Podstawowe pojęcia: klasa, obiekt, kapsułkowanie, dziedziczenie. Paradygmat projektowania obiektowego. Zasady dostępu w klasie: pola prywatne i publiczne. Kontekst wprowadzany przez klasę. Konstruktory i destruktory. Konstruktor kopiujący. 7. Zasadnicze rozszerzenia w stosunku do C. Referencja i wskaźnik. Modyfikator const. Identyfikacja funkcji przez nagłówek. Przeciążanie funkcji. Przeciążanie operatorów. Domyślne wartości parametrów formalnych. 8. Strumieniowe wejście/wyjście. Funkcje i klasy zaprzyjaźnione. Wyjątki: sposób zgłaszania i przechwytywania, dziedziczenie wyjątków. 9. Dziedziczenie. Dziedziczenie wielokrotne klasy bazowej. Zasady dostępu do pól klasy bazowej. Sposób realizacji dziedziczenia. Wirtualne dziedziczenie. Wirtualne metody. Szablony. Standardowa biblioteka klas szablonowych. 10. Graficzny interfejs użytkownika. Systemy „okienkowe”. Obsługa urządzeń graficznych na przykładzie wybranej biblioteki. 11. Sprawdzian 2 (20 pkt)",
     "assessment": "Laboratorium - 60 pkt Sprawdzian 1 - 20 pkt\nSprawdzian 2 - 20 pkt Punkty są przeliczne na\noceny wg tabeli 0-50 -> 2 51-60 -> 3 61-70 -> 3.5\n71-80 -> 4 81-90 -> 4.5 91-100 -> 5",
     "literature": "1. B. Kernighan, D. Ritchie, Język ANSI C, WNT, 2004\n2. B. Stroustrup, Język C++, WNT, 2002\n3. N. Wirth, Algorytmy + struktury danych = programy\n4. P. Wróblewski, Algorytmy. Struktury danych i techniki programowania, Helion 2003\n5. A. Lippmann, Programowanie obiektowe\n6. P. Silvester, System operacyjny unix.\n7. S. Lippman, Podstawy języka C++, WNT, 2003\n8. S. Prata,Język C++. Szkoła programowania, Wydanie V, Helion, 2006\n9. H. Schild, C++, ReadMe, 2002\n10. N. Josuttis, C++. Biblioteka standardowa. Podręcznik programisty; Helion, 2003\n11. S. Mayers, STL w praktyce. 50 sposobów efektywnego wykorzystania; Helion, 2004\n12. R. Lischner, STL. Leksykon kieszonkowy, Helion,\nO’Reilly, 2004"
    },
    {
     "name": "Fizyka 2",
     "block": "Podstawowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "hours": {
      "W": 30,
      "C": 15
     },
     "syllabusId": 900253,
     "code": "FIZ2",
     "coordinator": "Prof. dr hab. Jan ŻEBROWSKI",
     "exam": true,
     "prerequisites": "Fizyka I, Matematyka – Algebra liniowa i analiza, Matematyka II",
     "goal": "Celem przedmiotu jest zapoznanie studentów z podstawami fizyki w zakresie mechaniki kwantowej oraz fizyki statystycznej w zakresie typowym dla uniwersytetu technicznego ze szczególnym uwzględnieniem potrzeb Kierunku Inżynieria Biomedyczna. W wykładzie podkreśla się uniwersalność i interdyscyplinarność praw fizyki, eksponuje jej doświadczalny charakter i elementy współczesnego naukowego obrazu przyrody. Szczególną rolę w wykładzie odgrywa kwestia pomiaru w fizyce szczególnie w obszarze struktur o niewilekich rozmiarach i niewielkiej liczbie wymiarów.",
     "content": "Elementy mechaniki kwantowej: Powstanie mechaniki kwantowej, dualizm korpuskularno- falowy materii, postulaty mechaniki kwantowej.Równanie Schrodingera, cząstka swobodna w mechanice kwantowej, zjawisko tunelowe, atom w mechanice kwantowej, zasada Pauliego. Elementy fizyki jądra atomowego i cząstek elementarnych.Ruch cząstki w potencjale periodycznym (struktura pasmowa ciał stałych), momenty magnetyczne w atomie, własności magnetyczne substancji, rezonans jądrowy\ni ferromagnetyczny, układy niskowymiarowe,nanotechnologia. Elementy fizyki statystycznej: Mikro- i makrostan, przestrzeń fazowa, średnie wielkości fizycznych, zespół kanoniczny, entropia\ni temperatura statystyczna, układ o dwóch poziomach energii - inwersja obsadzeń i akcja laserowa, bozony i fermiony - statystyki kwantowe.",
     "assessment": "egzamin pisemny na koniec semestru i 1 jedno kolokwium wykładowe w połowie semestru 2 kolokwia w trakcie ćwiczeń",
     "literature": "Podręczniki Wykładówe\nR. Kosiński: Wprowadzenie do mechaniki kwantowej i fizyki statystycznej, Oficyna Wydawnicza PW, 2006 Kerson Huang ,\nPodstawy Fizyki Statystycznej, PWN Warszawa 2006; A. Sukiennicki, A. Zagórski: Fizyka ciała stałego, WN-T, 1984\nZbiory zadań\nM. Baj, G. Szeflińska, M. Szymański, D. Wasik, Zadania i problemy z fizyki. Fale elektromagnetyczne. Fale materii, PWN, Warszawa 1996; J.B. Brojan, J.Mostowski, K.Wódkiewicz, Zbiór zadań z mechaniki kwantowej, PWN 1978"
    },
    {
     "name": "Matematyka - Analiza 2",
     "block": "Podstawowe",
     "group": "Obowiązkowe",
     "ects": 6,
     "hours": {
      "W": 30,
      "C": 30
     },
     "syllabusId": 900247,
     "code": "MA2",
     "coordinator": "doc. dr Ewa Stankiewicz-Wiechno",
     "exam": true,
     "prerequisites": "Znajomość matematyki wyższej w zakresie treści i umiejętności przedmiotu Matematyka – Algebra liniowa i analiza.",
     "goal": "Zapoznanie studentów z podstawową wiedzą z zakresu szeregów liczbowych i najważniejszych szeregów funkcyjnych, całek podwójnych, potrójnych i krzywoliniowych, funkcji zmiennej zespolonej, przekształceń całkowych i rachunku operatorowego; Ukształtowanie umiejętności rozwiązywania zadań rachunkowych oraz problemów związanych z omawianymi zagadnieniami.",
     "content": "Treść wykładu : 1. Szeregi liczbowe (2h) podstawowe pojęcia; - kryteria zbieżności dla szeregów o wyrazach nieujemnych; - zbieżność bezwzględna i warunkowa. 2. Szeregi potęgowe (4h) - podstawowe własności szeregów potęgowych i sum takich szeregów; - szereg Taylora i Maclaurina. 3. Szeregi Fouriera (2h) 4. Całki wielokrotne (6h) - całki podwójne i potrójne i ich interpretacje geometryczne; - zamiana zmiennych w całkach wielokrotnych, współrzędne biegunowe, walcowe i sferyczne. 5. Całki krzywoliniowe (4h) - całka krzywoliniowa skierowana na płaszczyźnie, zamiana na całkę oznaczoną, twierdzenie Greena i wnioski z tego twierdzenia; - całka krzywoliniowa nieskierowana na płaszczyźnie. 6. Funkcje zmiennej zespolonej (5h) - pochodna funkcji zmiennej zespolonej, warunki Cauchy- Riemanna, funkcja holomorficzna; - całka funkcji zmiennej zespolonej, twierdzenie podstawowe Cauchy'go, wzór całkowy Cauchy'go. 7. Przekształcenie Fouriera (3h) - wzór całkowy Fouriera; - transformata Fouriera, widmo amplitudowe i widmo fazowe; splot funkcji. 8. Przekształcenie Laplace'a (4h) - całka Laplace'a, oryginał laplasowski; - przekształcenie Laplace'a i jego podstawowe własności; - rachunek operatorowy .\nZakres ćwiczeń: 1. Badanie zbieżności szeregów o wyrazach nieujemnych i wyrazach dowolnego znaku. (2h) 2. Obliczanie sum szeregów potęgowych z definicji i ze wzorów; rozwijanie funkcji w szereg Taylora i zastosowania takich rozwinięć. (3h) 3. Rozwijanie funkcji w szereg Fouriera, szereg kosinusowy oraz szereg sinusowy; obliczanie sum szeregów liczbowych. (3h) 4. Obliczanie całek podwójnych i potrójnych przez zamianę na całkę iterowaną, zamiana zmiennych, zastosowania geometryczne. (6h) 5. Obliczanie całek krzywoliniowych skierowanych na płaszczyźnie po łukach otwartych oraz po łukach zamkniętych (twierdzenie Greena); przykłady obliczania całek krzywoliniowych nieskierowanych. (4h) 6. Badanie podstawowych własności funkcji zmiennej zespolonej, obliczanie pochodnych takich funkcji oraz całek (przez zamianę na całkę oznaczoną oraz\nz wykorzystaniem twierdzenia podstawowego Cauchy'go i wzoru całkowego Cauchy'go) (5h) 7. Rozwijanie funkcji we wzór całkowy Fouriera; obliczanie transformaty Fouriera i wyznaczanie widma amplitudowego oraz widma fazowego funkcji. (2h) 8. Obliczanie splotu funkcji z definicji; obliczanie transformat Laplace'a podstawowych funkcji, wykorzystanie przekształcenia Laplace'a do rozwiązywania niektórych równań różniczkowych liniowych i układów takich równań metodą operatorową. (5h)",
     "assessment": "3 kolokwia, egzamin",
     "literature": "Literatura podstawowa: 1. W.Żakowski, W.Leksiński, Matematyka IV, WNT 2. W.Żakowski, W.Kołodziej, Matematyka II, WNT\nLiteratura uzupełniająca: 1. W.Krysicki, L.Włodarski, Analiza matematyczna w zadaniach, cz.II, PWN"
    },
    {
     "name": "Mechanika i Wytrzymałość materiałów",
     "block": "Podstawowe",
     "group": "Obowiązkowe",
     "ects": 5,
     "hours": {
      "W": 30,
      "C": 30
     },
     "syllabusId": 900251,
     "code": "MWM",
     "coordinator": "dr hab. inż. Edyta Ładyżyńska-Kozdraś, prof. nzw.PW",
     "exam": true,
     "prerequisites": "Zagadnienia matematyki matematyki i fizyki wykładane na pierwszym roku studiów technicznych.",
     "goal": "Rozwiązywanie problemów technicznych w oparciu o prawa mechaniki; wykonywanie analiz wytrzymałościowych elementów mechanicznych",
     "content": "ZAKRES WYKŁADU: Punkt materialny i ciało doskonale sztywne. Pojęcie siły. Siły zewnętrzne\ni wewnętrzne. Prawa Newtona. Jednostki masy i siły. Układy jednostek podstawowych. Zasady statyki. Więzy i ich reakcje. Płaski i przestrzenny układ sił zbieżnych. Równowaga płaskiego i przestrzennego układu sił zbieżnych. Moment siły względem punktu i względem osi. Siły równoległe. Para sił i moment pary sił. Równolegle przesunięcie siły. Płaski i przestrzenny układ sił równoległych. Równowaga płaskiego\ni przestrzen¬nego układu sił równoległych. Środek masy. Redukcja dowolnego przestrzennego układu sił. Ogólne warunki równowagi. Przykłady analizy układów sił zbieżnych i układów sił równoległych, na płaszczyźnie i w przestrzeni. Dowolne układy sił. Stopnie swobody i uwalnianie od więzów. Tarcie i prawa tarcia. Tarcie statyczne i kinetyczne. Tarcie ślizgowe i tarcie toczne. Własności ciał odkształcalnych. Założenia Wytrzymałości Materiałów. Wypadkowe siły wewnętrzne i naprężenia. Naprężenie normalne i styczne. Rozciąganie i ściskanie pręta prostego. Odkształcenia podłużne i poprzeczne. Związki fizyczne. Prawo Hooke'a. Współczynnik Poissona. Zasada Saint Venanta. Statyczna próba rozciągania. Stan czystego ścinania. Prawo Hooke'a dla czystego ścinania. Skręcanie prętów o przekroju kołowym. Zginanie prętów prostych. Momenty bezwładności. Siły poprzeczne i momenty zginające. Czyste zginanie. Proste zginanie. Wytrzymałość na zginanie. Zginanie ukośne. Jednoczesne zginanie i skręcanie. Hipotezy wytężenia. Utrata stateczności. Wyboczenie prętów prostych. Smukłość graniczna. Sprężyny śrubowe. Siły wewnętrzne w sprężynie. Naprężenia w sprężynie i projektowanie średnicy drutu. Wydłużenie sprężyny. Wielkości opisujące geometrię przekroju pręta. Położenie środka ciężkości przekroju. Momenty bezwładności. Twierdzenie Steinera. Wpływ obrotu osi na momenty bezwładności. Główne i centralne osie bezwładności. Pojęcie tensora naprężenia. Jednowymiarowy, płaski i trójwymiarowy stan naprężenia. Jednowymiarowy, płaski i trójwymiarowy stan odkształcenia. Uogólnione prawo Hooke'a i macierz modułów sprężystości. Anizotropia sprężysta. Równania równowagi w trójwymiarowym stanie naprężenia. Związki łączące pola odkształceń i przemieszczeń. Związki konstytutywne. Praca odkształcenia. Pola przemieszczeń wirtualnych. Zasada minimum energii potencjalnej. Analiza płaskiego stanu naprężenia. Funkcja Airy'ego. Równanie tarczy we współrzędnych prostokątnych i współrzędnych biegunowych. Stan odkształceń w tarczach sprężystych. Warunki brzegowe dla tarcz. Przykłady analizy tarcz. Stan naprężeń i odkształceń w płytach cienkich. Siły wewnętrzne. Równanie płyty we współrzędnych prostokątnych i biegunowych. Warunki brzegowe. Przykłady analizy płyt prostokątnych. Płyty kołowe obciążone osiowo-symetrycznie. Siły i momenty przekrojowe w powłokach. Błonowy stan naprężenia. Powłoki cienkościenne osiowo- symetrycznie. Równania równowagi: lokalne i globalne. Powłoki kuliste, walcowe i stożkowe. Optymalny kształt powłok obrotowych. Jednowymiarowe modele ośrodków ciągłych. Modele jednoparametrowe: Hooke'a, Newtona, Saint-Venanta. Modele dwuparametrowe: Kelvina- Voigta, Maxwella, Binghama. Pełzanie i relaksacja. Modele wieloparametrowe. ZAKRES ĆWICZEŃ AUDORYTORYJNYCH: Harmonogram ćwiczeń oraz ich treść odpowiada dokładnie treści wykładów, w zakresie analizy, przykładów i rozwiązywania zadań",
     "assessment": "kolokwia na ćwiczeniach audytoryjnych – 50%, egzamin - 50%",
     "literature": "1. Leyko J. „Mechanika ogólna\" t. 1 i 2, PWN, Warszawa 2002.\n2. Dyląg Z., Jakubowicz A., Orłoś Z. „Wytrzymałość Materiałów\" t. 1 i 2, WNT, Warszawa 1996.\n3. Timoszenko S., Goodier J. N. „Teoria sprężystości\" Arkady, Warszawa 1962.\n4. Gambin W., „Mechanika i Wytrzymałość Materiałow\" - materiały dla studentów kierunku Inżynieria Biomedyczna na CD, Warszawa 2009"
    },
    {
     "name": "Wstęp do elektrotechniki",
     "block": "Podstawowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "hours": {
      "W": 30,
      "C": 15
     },
     "syllabusId": 900249,
     "code": "ETC",
     "coordinator": "Marek Wojciech RUPNIEWSKI",
     "exam": true,
     "prerequisites": "Kurs algebry liniowej i analizy",
     "goal": "Celem przedmiotu jest przedstawienie podstawowych metod analizy obwodów elektrycznych oraz zaprezentowanie elementarnych układów (maszyn) elektrotechnicznych.",
     "content": "Liniowe obwody prądu stałego (9h): - Podstawoweelementy układów elektrycznych. Prawa Kirchoffa. Metoda węzłowa rozwiązywania układów elektrycznych. - Zasada superpozycji. Elementy równoważne. Twierdzenia Thevenina i Nortona. - Moc i Energia. Twierdzenie Tellegena. Twierdzenie o dopasowaniu. Elementy pasywne i aktywne. Liniowe obwody prądu sinusoidalnie zmiennego (6h): - Metoda amplitud zespolonych. Immitancje. Twierdzenia Thevenina i Nortona dla układów prądu sinusoidalnego. - Moce w układach prądu sinusoidalnego. Twierdznie o dopasowaniu. - Rezonans w układach elektrycznych. Obwody prądu okresowego (2h): - Szeregi Fouriera. Twierdzenie Parsevala. Transformata Fouriera. Transmitancja. Obwody nieliniowe (3h): - Podstawowe elementy nieliniowe obwodów elektrycznych. Prostowniki. Metoda prostej oporu. - Analiza małosygnałowa. Analiza stanów nieustalonych (2h): - Prawa komutacji. Analiza układów pierwszego rzędu. Obwody prądu trójfazowego (2h). Maszyny elektryczne (6h): - Silniki elektryczne - Prostowniki, falowniki, przetwornice napięcia.",
     "assessment": "Do zdobycia jest 100 punktów: 10p - krótkie sprawdziany podczas ćwiczeń 2x20p - kolokwia 50p - egzamin (w tym 20p część zadaniowa i 30p część testowa). Ocena wystawiana jest na podstawie liczby zdobytych punktów wg skali: 0p-50p 2; 51p-60p 3; 61p-70p 3.5; 71p-80p 4; 81p-90p 4.5; 91p-100p 5.",
     "literature": "1. M. Rupniewski: Elektrotechnika - Elementy teorii obwodów, preskrypt, Warszawa 2011,\n2. J. Osiowski, J. Szabatin: Podstawy Teorii Obwodów, tomy I-II, WNT, Warszawa 1995,\n3. W. Latek: Teoria maszyn elektrycznych, WNT, Warszawa 1987,\n4. J. Przepiórkowski: Silniki elektryczne w praktyce elektronika, BTC, 2007"
    }
   ]
  },
  {
   "number": 3,
   "courses": [
    {
     "name": "Grafika komputerowa",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 3,
     "hours": {
      "W": 15,
      "L": 15
     },
     "syllabusId": 900279,
     "code": "GRK",
     "coordinator": "Katarzyna Orzechowska, Ewa Piątkowska-Janko, Tymon Rubel, Damian Wanta",
     "exam": false,
     "prerequisites": "Podstawowa wiedza z zakresu technik komputerowych, algorytmiki, elementarnych struktur danych.",
     "goal": "1. Zapoznanie studentów z podstawowymi metodami grafiki komputerowej, służącymi wizualizacji wspierającej użytkowanie informacji w naukach biomedycznych, w szczególności przy wykorzystywaniu obrazowania medycznego w diagnostyce i terapii\n2. Ukształtowanie podstawowych umiejętności tworzenia prostych algorytmów grafiki komputerowej oraz wykorzystania metod grafiki do wizualizacji przestrzennych treści obrazowych.",
     "content": "Tematyka wykładów: 1 Wprowadzenie: zakres grafiki komputerowej, użyteczność i główne obszary zastosowań, historia rozwoju metod\ni algorytmów oraz sprzętu (do wyświetlania, tworzenia trwałych kopii, do wprowadzania danych, wskazujące) i oprogramowania graficznego, przykładowe demonstracje komputerowe 2 Akwizycja i modelowanie obrazów: urządzenia rejestrujące obrazów cyfrowych naturalnych i medycznych, definicje obrazu, modele geometryczne i obiektowe, kolor obiektu (modele RGB, HSV, inne), metody obróbki obrazów 3 Podstawy grafiki 2W: grafika rastrowa (antyaliasing, rysowanie prymitywów) i wektorowa, algorytmy Bresenhama rysowania linii i łuku okręgu, wypełniania przez spójność i kontrolę parzystości, rola geometrii obliczeniowej 4 Przekształcenia 2W i 3W: układ współrzędnych jednorodnych, znormalizowanych, operacje na płaszczyźnie i w przestrzeni 3W, przekształcenia tożsamościowe, symetrie, skrętność, przekształcenia afiniczne 5 Metody reprezentacji i modelowania obiektów: brzegów, krzywych, powierzchni, przestrzeni (fraktale, wielomiany Beziera, funkcje sklejane itp),animacja obiektów 6 Metody odtwarzania powierzchni i objętości: metody konturowe, maszerujących sześcianów, śledzenia promieni, projekcyjne 7 Rozstrzyganie widoczności: rzutowanie (perspektywiczne, równoległe), algorytm malarski, skaningowy, drzewa podziału binarnego, bufora głębokości, problem oświetlenia, cieniowania (metody Gouraud, Phonga), metoda śledzenia promieni, metoda bilansu energetycznego, odwzorowanie tekstury na obiekt, wirtualna kamera, wirtualne studio, realizm scen, łączenie grafiki i obrazów naturalnych 8 Graficzna komunikacja człowiek- komputer w zastosowaniach medycznych: wizualizacja i symulacja zjawisk, inteligentny interfejs, przegląd zastosowań medycznych (ultrasonografia, wirtualna endoskopia, wizualizacja w tomografii głowy i struktur kostnych, modele serca, symulacja chirurgiczna itp.) Tematy ćwiczeń laboratoryjnych: 1 Elementy cyfrowego przetwarzania i analizy obrazów 2 Podstawowe algorytmy grafiki 2W 3 Tworzenie i modelowanie scen 3W 4 Realizm scen 3W 5 Zastosowania medyczne: wizualizacja i animacja w 3W.",
     "assessment": "Kolokwia dotyczące treści wykładowych oraz zaliczenia kolejnych ćwiczeń na podstawie pracy podczas laboratoriów oraz przygotowywanych sprawozdań.",
     "literature": "Literatura\n\nJ. Zabrodzki, Grafika komputerowa, metody i narzędzia, WNT, 1994.\nJ.D. Foley, A. Dam, J. Hughes, R. Phillips, Wprowadzenie do grafiki komputerowej, WNT, 1995.\nP. Shirley, Fundamentals of Computer Graphics, CRC Press, 2009.\nG. Dougherty, Digital Image Processing for Medical Applications, Cambridge University Press, 2009.\n\nOprogramowanie\n\nMatlab (www.mathworsk.com, licencja TAH)\nBlender (www.blender.org)\nImageJ (imagej.nih.gov/ij)\nMeVisLab (www.mevislab.de)"
    },
    {
     "name": "Laboratorium elektrotechniki",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 2,
     "hours": {
      "L": 15
     },
     "syllabusId": 900267,
     "code": "ELT",
     "coordinator": "Dr Marek Wojciech RUPNIEWSKI",
     "exam": false,
     "prerequisites": "Elektrotechnika (ELKT)",
     "goal": "Celem przedmiotu jest zdobycie przez studentów praktycznej umiejętności analizy prostych fizycznych obwodów elektrotechnicznych z wykorzystaniem pojęć i metod omówionych na przedmiocie Elektrotechnika (ELKT).",
     "content": "1. Podstawowe elementy i prawa teorii obwodów (elementy rezystancyjne, źródła, prawa Kirchhoffa, prawo Ohma).\n2. Twierdzenia o źródłach zastępczych, zasada superpozycji i metoda prostej oporu.\n3. Obwody prądu sinusoidalnie zmiennego, Zjawisko rezonansu. Twierdzenie o dopasowaniu. Podstawowe zastosowania wzmacniaczy operacyjnych.\n4. Obwody nieliniowe i analiza małosygnałowa. Prostowniki.\n5. Filtry. Stany nieustalone w obwodach elektrycznych.",
     "assessment": "Ocena końcowa wyznaczana jest na podstawie średniej oceny (danej w procentach) z poszczególnych 5 ćwiczeń według następującej skali:\n0-50% 2, 51-60% 3, 61-70% 4, 71-80% 4.5, 81-90% 5.\nOcena z pojedynczego ćwiczenia (w procentach) dana jest formułą:\n(2d+3w+5s)/10,\ngdzie d, w oraz s to oceny, wyrażone w procentach, z pracy domowej, sprawdzianu (wejściówki) oraz sprawozdania.",
     "literature": "1. M. Rupniewski: Elektrotechnika - Elementy teorii obwodów, preskrypt, Warszawa 2011,\n2. J. Osiowski, J. Szabatin: Podstawy Teorii Obwodów, tomy I-II, WNT, Warszawa 1995,\n3. W. Latek: Teoria maszyn elektrycznych, WNT, Warszawa 1987,\n4. J. Przepiórkowski: Silniki elektryczne w praktyce elektronika, BTC, 2007"
    },
    {
     "name": "Podstawy Automatyki",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "hours": {
      "W": 30,
      "C": 15
     },
     "syllabusId": 900255,
     "code": "PAU",
     "coordinator": "dr inż. Jakub MOŻARYN",
     "exam": true,
     "prerequisites": "Wymagana ogólna znajomość zagadnień wykładanych w ramach przedmiotów: matematyka, w tym rachunek różniczkowy i całkowy, liniowe równania różniczkowe, przekształcenie Laplace'a, algebra Boole'a; fizyka, w tym podstawowe zagadnienia mechaniki ciała stałego, termodynamiki, mechaniki płynów, elektrotechniki.",
     "goal": "Nabycie umiejętności rozpoznania i oceny procesów podlegających automatyzacji. Przyswojenie podstawowych pojęć automatyki procesów ciągłych i automatyki procesów dyskretnych, metod badania i charakteryzacji elementów automatyki o działaniu ciągłym i o działaniu dyskretnym. Rozumienie zasad funkcjonowania podstawowych układów regulacji i funkcji elementów tworzących te układy. Poznanie wymagań stawianych układom regulacji i metod zapewnienia spełnienia tych wymagań (zapewnienie stabilności i wymogów jakościowych, dobór regulatorów i ich nastaw). Nabycie umiejętności projektowania układów sterowania procesami dyskretnymi w różnych technikach realizacyjnych i zasadach działania.",
     "content": "Podstawowe treści merytoryczne przedmiotu to:\n1. klasyfikacja procesów podlegających automatyzacji,\n2. pojęcia podstawowe dotyczące techniki regulacji,\n3. sygnały w układach automatyki,\n4. podstawowe liniowe człony dynamiczne - właściwości i metody ich opisu,\n5. metody opisu ciągłych liniowych układów dynamicznych (równania dynamiki, transmitancja operatorowa i widmowa, charakterystyki częstotliwościowe, charakterystyki dynamiczne i statyczne, zagadnienia linearyzacji),\n6. połączenia elemantarne członów dynamicznych,\n7. algebra schematów blokowych,\n8. wymagania stawiane układom regulacji - kryteria stabilności, dokładność statyczna, wskaźniki jakości dynamicznej,\n9. obiekty regulacji - metody identyfikacji,\n10. regulatory PID,\n11. projektowanie liniowych układów regulacji,\n12. dobór regulatorów i ich nastaw,\n13. podstawowe układy nieliniowe.\n14. Środki techniczne automatyzacji procesów dyskretnych.\n15. Podstawy matematyczne sterowania dyskretnego - algebra Boole'a, synteza i minimalizacja funkcji logicznych, kody binarne liczb całkowitych.\n16. Projektowanie układów kombinacyjnych, sieci bramkowe i stykowo- przekaźnikowe, dynamika układów kombinacyjnych.\n17. Elementarne asynchroniczne i synchroniczne układy sekwencyjne.\n18. Projektowanie układów sekwencyjnych o programach liniowych i rozgałęzionych asynchronicznych i syn-chronicznych.\n19. Typowe układy o średniej skali integracji, układy mikroprogramowalne.",
     "assessment": "kolokwia na ćwiczeniach audytoryjnych, egzamin końcowy",
     "literature": "- Kościelny W.: Podstawy automatyki - materiały do wykładówdla studentów kierunku Inżynieria Biomedyczna, ss. 276;\n- Kościelny W.: Materiały pomocnicze do nauczania podstaw automatyki. Oficyna Wydawnicza PW, Warszawa 2001, wyd. III;\n- Kościelny W.: Podstawy automatyki, część II. Wydawnictwa Politechniki Warszawskiej, 1984;\n- Holejko D., Kościelny W., Niewczas W.: Zbiór zadań z podstaw automatyki. Wydawnictwa Politechniki War-szawskiej, 1985, wyd. VIII;\n- Mazurek J., Vogt H., Zydanowicz W.: Podstawy automatyki. Oficyna Wydawnicza PW, Warszawa 2002;\n- Gessing R.: Podstawy automatyki. Wydawnictwo Politechniki Śląskiej, 2001;\n- Żelazny M.: Podstawy Automatyki. WNT, Warszawa 1976;\n- Zieliński C.: Podstawy projektowania układów cyfrowych. PWN, Warszawa, 2003"
    },
    {
     "name": "Podstawy elementów i układów elektronicznych",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "hours": {
      "W": 30,
      "C": 15
     },
     "syllabusId": 900268,
     "code": "ELR",
     "coordinator": "prof. nzw. dr hab. inż. Lidia Łukasiak",
     "exam": true,
     "goal": "Celem przedmiotu jest przedstawienie zasad działania i najważniejszych parametrów podstawowych przyrządów półprzewodnikowych oraz zasad działania, konstrukcji, a także metod analizy układów analogowych.",
     "content": "Właściwości półprzewodników (znaczenie struktur półprzewodnikowych w elektronice (prawo Moore'a i jego konsekwencje, materiały półprzewodnikowe, model pasmowy półprze-wodnika, koncentracje nośników ładunku, procesy generacji-rekombinacji, transport nośników ładunku).\nStyk metal-półprzewodnik i złącze p-n (kontakt omowy, dioda z barierą Schottky'ego, charakterystyka prądowo- napięciowa i parametry dynamiczne złącza p-n, rodzaje diod półprze-wodnikowych).\nTranzystor MOS (zasada działania, charakterystyki prądowo-napięciowe, częstotli-wości graniczne, inwerter CMOS). Reguły skalowania. Technologia MOS SOI. Struktury wielobramkowe. Tranzystor bipolarny (zasada działania i podstawowe parametry).\nTranzystory bipolarne heterozłączowe.\nPółprzewodnikowe przyrządy fotoniki (diody świecące, lasery półprzewodnikowe). Przegląd różnego typu elementów elektronicznych. Układy liniowe (wzmacniacz tranzystorowy - zasada działania, wzmacniacz różnicowy - zasada działania, właściwości dla sygnałów różnicowych i sumacyjnych, wzmacniacz operacyjny - idea, podstawowe układy pracy oraz ich właściwości, parametry rzeczywistych wzmacniaczy opera-cyjnych, budowawewnętrzna wzmacniacza, charakterystyki częstotliwościowe, sprzężenie zwrotne i jego rola w układach elektronicznych, przykłady zastosowań, filtry, komparatory). Układy nieliniowe (generatory przebiegów sinusoidalnych, generatory kwarcowe, generatory funkcyjne, generatory przestrajane VCO, układy z fazoczułą pętlą sprzężenia zwrotnego (PLL), generator z bezpośrednią cyfrową syntezą częstotliwości (DDS), modulatory, detektory, układy przemiany częstotliwości). Przetworniki A/C i C/A (architektura typowego toru przetwarzania sygnałów, próbkowanie, twierdzenie o próbkowaniu, widmo sygnału spróbkowanego, zjawisko aliasingu, kwantyzacja, kodowanie, parametry przetworników, podstawowe architektury przetworników A/C i C/A, zasada działania, rodzaje interfejsu, kryteria doboru przetwornika do wybranych aplikacji). Zasilacze o działaniu ciągłym i impulsowym (układy prostowników napięcia, układy stabilizacji napięcia ciągłe i impulsowe, właściwości, parametry, źródła napięciowe i prądowe, układy ograniczania prądu i napięcia, przykładowe rozwiązania). Komputerowa symulacja układów analogowych i cyfrowych, zasada działania symulatorów układów analogowych i cyfrowych, zalety i wady stosowania symulatorów komputerowych, wyznaczanie punktów pracy, symulacja małosygnałowa,analiza przejściowa (transient), analiza szumów i wpływu rozrzutów parametrów elementów elektro-nicznych, optymalizacja układów elektronicznych.",
     "assessment": "Kolokwia; egzamin",
     "literature": "Materiały przygotowane przez prowadzących i dostępne na stronie przedmiotu.\nS.M. Sze, K. Ng, \"Physics of semiconductor devices\", John Wiley & Sons Inc. Hoboken, New Jersey, 2007.\nJ. Hennel, \"Podstawy elektroniki półprzewodnikowej\", WNT, Warszawa 1991.\nW. Marciniak, \"Przyrządy półprzewodnikowe i układy scalone\", WNT, Warszawa 1984.\nP. Jagodziński, A. Jakubowski, \"Zasady działania przyrządów półprzewodnikowych typu MIS\", WPW 1980.\nJ. Baranowski, Z. Nosal, \"Układy elektroniczne, cz. I, Układy analogowe liniowe\", WNT 1998.\nJ. Baranowski, G. Czajkowski, \"Układy elektroniczne, cz. II, Układy analogowe nieliniowe i impulsowe\", WNT 1998.\nA. Filipkowski, \"Układy elektroniczne analogowe i cyfrowe\", WNT 1998."
    },
    {
     "name": "Radiologia",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 3,
     "hours": {
      "W": 30,
      "L": 15
     },
     "syllabusId": 900264,
     "code": "RAD",
     "coordinator": "dr hab. inż. Piotr Tulik",
     "exam": true,
     "prerequisites": "Podstawowa wiedza z zakresu fizyki atomowej.",
     "goal": "Podstawowe przygotowanie do pracy w ośrodkach stosujących promieniowanie jonizujące w celach diagnostycznych na stanowiskach inżynierskich oraz w podmiotach instalujących oraz obsługujących urządzenia radiologiczne.",
     "content": "Zakres wykładu obejmuje:\nFizyczne podstawy radiologii.\nOddziaływanie promieniowania X i γ z materią.\nOddziaływanie cząstek naładowanych z materią.\nGeneracja promieniowania X.\nLampa RTG.\nBudowa i zasada działania aparatu RTG.\nWybrane techniki radiograficzne.\nObraz rentgenowski.\nRentgenowska tomografia komputerowa.\nPodstawy diagnostyki izotopowej.\nOddziaływanie promieniowania jonizującego na organizmy żywe.\nPodstawy dozymetrii i ochrony radiologicznej.\nDetektory promieniowania jonizującego.\n\nZakres zajęć laboratoryjnych obejmuje:\nBudowa i zasada działania aparatu RTG – tryb radiografii i fluoroskopii.\nWyznaczanie warstwy półchłonnej, liniowego współczynnika osłabienia.\nWyznaczanie wybranych parametrów aparatu RTG.\nBadanie rozkładu pól promieniowania rozproszonego w pracowni RTG.\nBadanie wpływu wysokiego napięcia na lampie RTG oraz filtracji na widmo promieniowania X.\nSymulacja generacji oraz transportu promieniowania X z wykorzystaniem środowiska obliczeniowego bazującego na metodzie Monte Carlo.",
     "assessment": "wykład - zaliczenie na podstawie egzaminu;\nlaboratorium - zaliczenie na podstawie sprawdzianów i sprawozdań;",
     "literature": "G.F. Knoll, Radiation Detection and Measurements, John Wiley and Sons, 2000\nPlanowanie leczenia i dozymetria w radioterapii (Tom 1), red. J. Malicki, K. Ślosarek, Via Medica Wydawnictwo, Gdańsk, 2016\nDiagnostyka obrazowa. Podstawy teoretyczne i metodyka badań, red. B.Pruszyński, PZWL, Warszawa, 2020\nBiocybernetyka i inżyniera biomedyczna 2000, tom.9 Fizyka medyczna, red. M. Nałęcz; Akademicka Oficyna Wydawnicza EXIT\nS.C. Bushong, Radiologic Science for Technologists : Physics, Biology, and Protection, Elsevier, 2016"
    },
    {
     "name": "Wspomagane komputerowo projektowanie inżynierskie",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 5,
     "hours": {
      "W": 30,
      "L": 15,
      "P": 15
     },
     "syllabusId": 900261,
     "code": "KPI",
     "coordinator": "Dr hab. inż. Danuta JASIŃSKA-CHOROMAŃSKA, prof. PW oraz Dr inż. Marcin Zaczyk",
     "exam": false,
     "prerequisites": "Podstawy mechaniki, zasady użytkowania komputerów, podstawy programowania",
     "goal": "Umiejętność projektowania elementów biomechanicznych z wykorzystaniem metod wspomagania komputerowego.",
     "content": "Sposoby zapisu konstrukcji; Zapis postaci geometrycznej; Rysunki złożeniowe; Grafika komputerowa w tworzeniu dokumentacji technicznejMES i MEB MES i MEB w projektowaniu komputerowym. Wybrane metody numeryczne optymalizacji; Systemy CAD/CAM.\n\nZAKRES WYKŁADU: Formy i zasady zapisu konstrukcji, podstawowe pojęcia geometrii wykreślnej (rzutowanie, odwzorowanie na płaszczyźnie). Zasady zapisu postaci geometrycznej, stosowanie uproszczeń w zapisie, zapis układu wymiarów i tolerancji. Zasady tworzenia rysunków złożeniowych, stosowane uproszczenia i pomoce opisowe. Zasady scalania i nadzoru dokumentacji. Wykorzystanie grafiki komputerowej w procesie tworzenia dokumentacji technicznej. Podstawy metody elementów skończonych (MES) i brzegowych (MEB). Zastosowanie MES i MEB w komputerowym wspomaganiu projektowania. Podstawy optymalizacji, przedstawienie wybranych metod numerycznych optymalizacji, zastosowanie wybranych metod numerycznych optymalizacji w projektowaniu inżynierskim . Zakres możliwości i zastosowań systemów CAM, współdziałanie systemów CAM z innymi systemami, wymagania programów CAM, rozwój systemów CAD/CAM, kryteria oceny systemów CAD/CAM, omówienie przykładowego systemu wspomaganego komputerowo projektowania procesów obróbki. ZAKRES ĆWICZEŃ LABORATORYJNYCH:\nTworzenie brył i części, rzutowanie elementów, dokumentacja części w programie CAD. Tworzenie zespołów, generowanie rysunków złożeniowych na podstawie dokumentacji przestrzennej w programie CAD. Analiza geometryczna, analiza kinematyki i dynamiki, wykorzystanie MES/MEB do analizy pracy projektowanego urządzenia. ZAKRES ĆWICZEŃ PROJEKTOWYCH: Przejście z programów CAD do oprogramowania CAM, napisanie programu sterującego urządzeniem CNC, wykorzystanie baz danych programów CAM, symulacja działania urządzenia CNC. Rysowanie schematów elektronicznych w systemach CAM, wykorzystanie baz danych elementów w systemie CAM, optymalizacja połączeń, określenie obszarów zastrzeżonych, trasowanie automatyczne ścieżek, symulacja działania zaprojektowanego obwodu.",
     "assessment": "Metody oceny:\n1. ocena bieżącej pracy studenta na zajęciach\n2. ocena okresowa na 2 kolokwiach",
     "literature": "1. M.Miecielica, W.Wisniewski - Komputerowe wspomaganie projektowania procesów. PWN 2005;\n2. M.Miecielica - Komputerowe wspomaganie wytwarzania CAM. Mikom 1999;\n3. K. Paprocki - Zasady zapisu konstrukcji. OWPW 2005;\n4. A. Bober, M. Dudziak - Zapis konstrukcji. WNT 1999 5.\n5. Materiały firmowe AutoDesk, PTC (program AutoCAD 2007, .Inventor, ProEngineer,...), SSC (Working Model)\n6. Materiały firmowe doprogramów komp.: ADAMS, ANSYS, .ABAQUS, ANSYS dla Inventora, ProMechanica dla ProEngineera\n7.T. Dobrzański - Rysunek techniczny maszynowy. WNT W-wa, wyd. 24\n8.T. Zagrajek, G. Krzesiński, P. Marek - Metoda elementów skończonych w mechanice konstrukcji. Ćwiczenia z zastosowaniem systemu ANSYS, Of. Wyd. PW, W-wa 2006\n9.G. Rakowski, Z. Kacprzyk - Metoda elementów skończonych w mechanice konstrukcji. Of. Wyd. PW, W-wa 2005\n10.J. Kruszewski, S. Sawiak, E. Wittbrodt - Metoda sztywnych elementów skończonych w dynamice konstrukcji. WNT, W-wa 1999\n11.A. Jaworski - Metoda elementów brzegowych. Of. Wyd. PW, W- wa 2000"
    },
    {
     "name": "Matematyka - Rachunek prawdopodobieństwa i statystyka",
     "block": "Podstawowe",
     "group": "Obowiązkowe",
     "ects": 5,
     "hours": {
      "W": 30,
      "C": 30
     },
     "syllabusId": 900250,
     "code": "MAT3",
     "coordinator": "dr inż. Ewa FRANKIEWICZ",
     "exam": true,
     "prerequisites": "Znajomość rachunku różniczkowego i całkowego funkcji jednowymiarowych i dwuwymiarowych; znajomość działań na macierzach.",
     "goal": "Zapoznanie studentów z podstawowymi pojęciami z rachunku prawdopodobieństwa i statystyki matematycznej mogącymi mieć zastosowanie w badaniach biologicznych i medycznych; ukształtowanie umiejętności wyznaczania prawdopodobieństwa zdarzeń losowych, parametrów zmiennych losowych oraz analizowania danych statystycznych.",
     "content": "Treść wykładu : 1. Model probabilistyczny - podstawy. (4h) - przestrzeń probabilistyczna - własności prawdopodobieństwa - przykłady określania prawdopodobieństwa: przeliczalny zbiór zdarzeń elementarnych, prawdopodobieństwo klasyczne\ni geometryczne - definicja prawdopodobieństwa warunkowego, wzór na prawdopodobieństwo całkowite, wzór Bayesa - niezależność zdarzeń\n2. Jednowymiarowe zmienne losowe (6h) - zmienne losowe jednowymiarowe o rozkładach dyskretnych\ni ciągłych - wybrane rozkłady jednowymiarowe - charakterystyki liczbowe zmiennych losowych jednowymiarowych 3. Zmienne losowe dwuwymiarowe (4h) - zmienne losowe dwuwymiarowe o rozkładach dyskretnych i ciągłych - niezależność zmiennych losowych - dwuwymiarowy rozkład jednostajny i normalny - charakterystyki liczbowe dwuwymiarowych zmiennych losowych 4. Twierdzenia graniczne (2h) 5. Elementy statystyki opisowej (10h) - wskaźniki położenia i rozproszenia w próbie - graficzne przedstawienie danych - metody wyznaczania estymatorów - przedziały ufności - metody weryfikacji hipotez statystycznych - badanie współzależności zmiennych losowych 6. Wprowadzenie do procesów stochastycznych (4h) - łańcuchy Markowa, procesy urodzin i śmierci - szeregi czasowe Zakres ćwiczeń: 1. Wyznaczanie prawdopodobieństwa za pomocą definicji klasycznej i geometrycznej oraz w przypadku przeliczalnej przestrzeni zdarzeń elementarnych.(2h) 2. Obliczanie prawdopodobieństwa warunkowego, wykorzystanie wzoru na prawdopodobieństwo całkowite i wzoru Bayesa.(2h) 3. Wyznaczanie rozkładów zmiennych losowych jednowymiarowych oraz obliczanie prawdopodobieństw związanych z tymi zmiennymi.(4h) 4. Obliczanie wartości oczekiwanych\ni wariancji zmiennych losowych jedno-wymiarowych.(3h) 5. Wyznaczanie rozkładów zmiennych losowych dwuwymiarowych oraz prawdopodobieństw związanych z tymi zmiennymi, wyznaczanie rozkładów brzegowych, badanie niezależności zmiennych losowych. (4h) 6. Obliczanie parametrów związanych ze zmiennymi losowymi dwuwymiarowymi.(3h) 7. Obliczanie prawdopodo-bieństwa za pomocą centralnego twierdzenia granicznego. (2h) 8. Wyznaczanie wskaźników położenia i rozproszenia dla próby losowej oraz ich interpretacja. (2h) 9. Wyznaczanie estymatorów oraz przedziałów ufności. (5h) 10. Testowanie hipotez statystycznych. (3h)",
     "assessment": "3 kolokwia, egzamin",
     "literature": "Literatura podstawowa:\n1. J.Jakubowski, R.Sztencel, Rachunek prawdopodobieństwa dla (prawie) każdego, SCRIPT\n2. J.Koronacki, J.Mielniczuk, Statystyka dla studentów kierunków technicznych i przyrodniczych, WNT\n3. W.Krysicki, J.Bartos, W.Dyczka, K.Królikowska, M.Wasilewski, Rachunek prawdopodobieństwa\ni statystyka matematyczna w zadaniach, część I i II, PWN\n4. A.Plucińska, E.Pluciński, Probabilistyka, WNT 5. A.Sosnowski, E.Stankiewicz-Wiechno, P.Szabłowski, Metody probabilistyczne w przykładach i zadaniach, WPW\nLiteratura uzupełniająca:\n1. U.Foryś, Matematyka w biologii, WNT"
    }
   ]
  },
  {
   "number": 4,
   "courses": [
    {
     "name": "Biomechanika inżynierska",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "hours": {
      "W": 30,
      "L": 15
     },
     "syllabusId": 900276,
     "code": "BMIN",
     "coordinator": "dr inż. Szymon Cygan",
     "exam": true,
     "prerequisites": "Student powinien posiadać wiedzę z zakresu podstaw mechaniki i wytrzymałości materiałów. Musi mieć też opanowaną podstawową znajomość zagadnień miernictwa elektrycznego oraz układów elektronicznych. Ponadto wskazane jest, aby miał opanowany zarys anatomii i fizjologii człowieka.",
     "goal": "Celem przedmiotu jest zapoznanie studentów z podstawowymi zagadnieniami związanymi z mechaniką organizmów żywych, własnościami mechanicznymi tkanek i metodologią ich badania.\nStudenci zapoznają się również z fizjologicznymi podstawami funkcjonowania struktur nerwowo - mięśniowych oraz sposobami sterowania czynnością mięśni w warunkach naturalnych oraz z wykorzystaniem funkcjonalnej stymulacji elektrycznej.\nPoznają też modle strukturalne i funkcjonalne układu ruchu człowieka i metody wyznaczania reakcji w wyniku zadanych bodźców obciążeń, a także istniejące rozwiązania konstrukcyjne urządzeń stosowanych w terapii i rehabilitacji narządu ruchu.",
     "content": "1. Wprowadzenie: podstawowe pojęcia biomechaniki i definicje: elementy strukturalne biomechanizmów, łańcuchy biokinematyczne, stopnie swobody i ruchliwość biomechanizmów.\n2. Statyka aparatu ruchu: budowa oraz mechaniczne i fizyczne właściwości struktur kostno-stawowych człowieka. Podstawy wytrzymałości materiałów tkankowych. Metodologia badania własności mechanicznych tkanek. Parametry postawy ciała - postawa prawidłowa i patologiczna.\n3. Kinematyka aparatu ruchu: modele stosowane do opisu kinematyki narządu ruchu; wyznaczanie ruchliwości poszczególnych stawów; metody opisu, rejestracji i analizy ruchu człowieka.\n4. Dynamika aparatu ruchu: fizjologia układu nerwowo - mięśniowego; modele wykorzystywane do obliczania obciążeń przenoszonych przez poszczególne elementy aparatu ruchu; metody wyznaczania siły mięśniowej oraz obciążeń w stawach.\n5. Budowa i biomechanika kręgosłupa: budowa kręgosłupa i jego własności mechaniczne; modele obciążeń kręgosłupa; stany patologiczne.\n6. Biomechanika urazów: biomechaniczne aspekty przeciążania struktur tkankowych; mechanizmy urazów; zdolności adaptacyjne organizmu; zjawisko remodelingu.\n7. Wprowadzenie do inżynierii rehabilitacyjnej: wymagania stawiane urządzeniom rehabilitacyjnym z uwagi na bezpieczeństwo pacjenta.\n8. Urządzenia mechaniczne i mechaniczno-elektroniczne stosowane w rehabilitacji: ortozy i protezy kończyn dolnych i górnych, bioprotezy; funkcjonalna elektrostymulacja.\n9. Fizjologiczne podstawy funkcjonowania struktur nerwowo – mięśniowych\n10. Sterowanie czynnością ruchową w warunkach naturalnych oraz z wykorzystaniem funkcjonalnej stymulacji elektrycznej.\n11. Analiza, ocena ruchu i chodu człowieka: problematyka analizy ruchu człowieka (funkcji lokomocyjnych), urządzenia pomiarowe do badania chodu; analiza poszczególnych faz chodu i reakcji podłoża; pomiar energii wydatkowanej w trakcie chodu.",
     "assessment": "Zajęcia wykładowe: egzamin końcowy weryfikujący wiedzę studentów. Test wielokrotnego wyboru z pytaniami otwartymi.\nZajęcia laboratoryjne: Przed przystąpieniem do zajęć laboratoryjnych student zobowiązany jest zapoznać się z wiadomościami dotyczącymi zajęć, które będą weryfikowane przed przystąpieniem do ćwiczeń. Spis literatury pomocny do przygotowania się do zajęć znajduje się w instrukcjach do ćwiczeń. Z każdego ćwiczenia należy opracować zespołowe sprawozdanie, które będzie oceniane przez prowadzącego zajęcia.\nOcena końcowa: na ocenę końcową z przedmiotu składają się punkty z laboratorium (z wagą 40%) i z egzaminu (60%).",
     "literature": "1. Hausmanowa - Petrusewicz I., \"Elektromiografia kliniczna\",PZWL Warszawa, 1983\n2. Konturek St. J., \"Fizjologia człowieka\",Elsevier Urban & Partner Wrocław, 2007\n3. Merletti R., Parker A., \"Electromyography - physiology, engineering and noninvasive applications\",IEEE Press 2004\n4. Morecki A., Fidelus K., Ekiel J., \"Bionika ruchu\",PWN\n5. Paśniczek R., \"Wybrane urządzenia wspomagające i fizykoterapeutyczne w rehabilitacji porażeń ośrodkowego układu nerwowego i amputacjach kończyn\",Oficyna Wydawnicza Politechniki Warszawskiej Warszawa, 1998\n6. Perry J., \"Gait Analysis: Normal and Pathological Function\",SLACK Incorporated 2010\n7. Whittle M., \"Gait analysis - an introduction\",Butterworth Heinemann Elcevier 2007\n8. A. White: \"Clinical Biomechanics of the Spine\", J. P. Lippincott Company, Philadelphia, 1990\n9. „Podstawy Biomechaniki\", J. Mrozowski, J. Awrejcewicz, 2004\n10. „Biomechanika układu ruchu człowieka\", T. Bober, J. Zawadzki, 2003\n11. „Biomechanika Inżynierska“, R. Będziński, 1997"
    },
    {
     "name": "Metody numeryczne",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "hours": {
      "W": 30,
      "P": 15
     },
     "syllabusId": 900272,
     "code": "MEN",
     "coordinator": "prof. dr hab. Roman Z. MORAWSKI",
     "exam": false,
     "prerequisites": "Wiedza z przedmiotów: Algebra liniowa i analiza, Matematyka II, Rachunek prawdopodobieństwa i statystyka",
     "goal": "Praktyczne zapoznanie studentów z wybranymi algorytmami numerycznymi oraz elementami metodyki badania ich przydatności do rozwiązywania zadań inżynierskich.",
     "content": "Treść wykładu: 1. Komputer w rozwiązywaniu zadań inżynierskich (2 h): - sprowadzanie zadań inżynierskich do standardowych problemów numerycznych; - przykłady zastosowania metod numerycznych w elektronice, telekomunikacji i metrologii. 2. Wprowadzenie do programowania w systemie MATLAB (2 h): - organizacja programu w języku systemu MATLAB; - podstawowe operacje na wektorach i macierzach; - podstawowe operacje graficzne. 3. Metodyka analizy zadań i algorytmów numerycznych (4 h): - zadania i algorytmy numeryczne oraz sposoby ich opisu; - model propagacji błędów reprezentacji danych i błędów zaokrągleń operacji zmiennopozycyjnych; - numeryczne uwarunkowanie zadań numerycznych oraz numeryczna poprawność algorytmów numerycznych; - intuicyjne metody oceny złożoności algorytmów numerycznych. 4. Rozwiązywanie liniowych równań algebraicznych (4 h): - rozwiązywanie układów liniowych równań algebraicznych metodą eliminacji Gaussa; rozwiązywanie układów liniowych równań algebraicznych metodą Gaussa-Seidela. 5. Rozwiązywanie nieliniowych równań algebraicznych (4 h): - elementy analizy algorytmów iteracyjnych (zbieżność lokalna i osiągalna dokładność); - rozwiązywanie równań nieliniowych metodą bisekcji, metodą Newtona i metodą siecznych; - rozwiązywania układów równań nieliniowych metodą Newtona-Raphsona. 6. Aproksymacja i interpolacja funkcji jednej zmiennej (4h): - interpolacja ciągu danych za pomocą wielomianu Lagrange'a oraz wielomianowej funkcji sklejanej trzeciego stopnia; - aproksymacja ciągu danych metodą najmniejszych kwadratów. 7. Numeryczne całkowanie i różniczkowanie funkcji jednej zmiennej (2 h): - całkowanie metodą prostokątów, metodą trapezów oraz metodą analitycznego całkowania interpolującej funkcji sklejanej trzeciego stopnia; - różniczkowanie za pomocą dwuskładnikowych formuł różnicowych oraz metodą analitycznego różniczkowania interpolującej funkcji sklejanej trzeciego stopnia. 8. Rozwiązywanie równań różniczkowych zwyczajnych (4 h): - rozwiązywanie skalarnych równań różniczkowych zwyczajnych przy użyciu otwartej i zamkniętej metody Eulera; - rozwiązywanie skalarnych równań różniczkowych zwyczajnych przy użyciu otwartych i zamkniętych metod Adamsa i Geara pierwszego i drugiego rzędu. Do każdego rozdziału studenci otrzymują pakiet zadań (z rozwiązaniami), umożliwiający ćwiczenie umiejętności ich rozwiązywania. Zakres projektu: Studenci realizują indywidualnie w czasie semestru trzy zadania projektowe z każdej z następujących grup tematycznych: - Pro1. Rozwiązywanie liniowych równań algebraicznych; - Pro2. Rozwiązywanie nieliniowych równań algebraicznych; - Pro3. Rozwiązywanie równań różniczkowych zwyczajnych.",
     "assessment": "Realizacja każdego z tych zadań monitorowana jest przez prowadzących w trybie trzech 10-minutowych spotkań konsultacyjnych.\nStopień opanowania wiedzy stanowiącej treść wykładu i umiejętności rozwiązywania zadań oceniany jest podczas dwóch pisemnych sprawdzianów audytoryjnych (Spr1 i Spr2). Ocena efektów kształcenia uzyskanych w wyniku rozwiązania zadań projektowych Pro1, Pro 2 i Pro3 odbywa się na podstawie pisemnego sprawozdania i rozmowy z jego autorem; ocenie podlega także zgodność formy tego sprawozdania ze standardami redagowania tekstów technicznych.",
     "literature": "Z. Fortuna, B. Macukow, J. Wąsowski, Metody numeryczne, WNT, Warszawa 2005\nA. Grabarski, I. Musiał-Walczak, W. Sadkowski, A. Smoktunowicz, J. Wąsowski: Ćwiczenia laboratoryjne z metod numerycznych, Oficyna Wydawnicza PW, Warszawa 2002.\nJ. Krupka, A. Miękina, R. Z. Morawski, L. Opalski: Wstęp do metod numerycznych dla studentów elektroniki i technik informacyjnych. Oficyna Wydawnicza PW, Warszawa 2009.\nB. Mrozek, Z. Mrozek: MATLAB 6, Wyd. PLJ, Warszawa 2001.\nM. Stachurski: Metody numeryczne w programie MATLAB. Wyd. MIKOM, Warszawa 2003."
    },
    {
     "name": "Podstawy obrazowania medycznego",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "hours": {
      "W": 30,
      "L": 15
     },
     "syllabusId": 900263,
     "code": "POM",
     "coordinator": "dr inż. Piotr Brzeski",
     "exam": true,
     "prerequisites": "zaliczenie bądź studiowanie równolegle przedmiotu Radiologia (RAD).",
     "goal": "Celem przedmiotu jest teoretyczne i praktyczne zapoznanie studentów z rodzajami obrazów medycznych i zjawiskami fizycznymi, na podstawie których są tworzone. Omówione zostaną : radiografia, scyntygrafia, tomografie: NMR, rentgenowska i izotopowa oraz ultrasonografia.",
     "content": "Powstawanie obrazu w ujęciu systemowym. Związki między właściwościami obiektu a parametrami obrazu. Odpowiedź impulsowa źródła punktowego. Modulacyjna funkcja przenoszenia. Obrazy endoskopowe. Obrazowanie warstwowe. Akwizycja danych i metody rekonstrukcji obrazu w tomografii komputerowej. Metody rekonstrukcji obrazu dwu-\ni trójwymiarowego Wykorzystanie izotopów promieniotwórczych do wizualizacji czynności narządów wewnętrznych. Scyntygrafia. Tomografia emisyjna . Wizualizacja za pomocą promieniowania niejonizującego . Magnetyczny rezonans wodorowy - fizyczne podstawy obrazowania. Zasady lokalizacji źródeł sygnału obrazowego . Obrazowanie multimodalne .",
     "assessment": "Ocena jest średnią ważoną z oceny z egzaminu i laboratorium.\nStudent na ocenę pozytywną musi zaliczyć i egzamin i laboratorium. Ocena z laboratorium jest średnią arytmetyczną ze wszystkich ćwiczeń. Niezaliczenie dwóch ćwiczeń powoduje niezaliczenie laboratorium.",
     "literature": "1 P. Sprawls, Physical Principles of Medical Imaging, Aspen Publ.,1987.\n2 C-N. Chen, D. I. Hoult, Biomedical Magnetic Resonance Technology, Adam Hilger, 1989.\n3 M. Krzemińska- Pakuła, Metody obrazowe w diagnostyce układu krążenia, PZWL, 1991.\n4 T. D. Cradduck, Digital Networks and Communications in NuclearMedicine, The Michener Institute, Toronto, Canada, 1993."
    },
    {
     "name": "Podstawy Robotyki",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 2,
     "hours": {
      "W": 15
     },
     "syllabusId": 900273,
     "code": "POROB",
     "coordinator": "dr hab. inż. Mariusz Olszewski, prof. nzw. PW",
     "exam": true,
     "prerequisites": "Znajomość podstawowych zagadnień z zakresu podstaw automatyki, elektrotechniki i elektroniki oraz obsługi systemów komputerowych. Znajomość matematyki na poziomie wyższym.",
     "goal": "Zdobycie podstawowych umiejętności w zakresie budowy mechanizmów, sterowania, programowania i wykorzystania manipulatorów i robotów w inżynierii biomedycznej.",
     "content": "Podstawowa wiedza na temat robotyki i robotyzacji. Rozwój i stan obecny techniki robotyzacyjnej. Podziały robotyki jako dziedziny techniki i nauki. Potrzeby i bariery robotyzacji. Robotyzacja zadań produkcyjnych (roboty przemysłowe). Robotyzacja zadań lokomocyjnych (roboty mobilne). Robotyzacja zachowań człowieka (roboty humanoidalne). Perspektywy rozwoju techniki robotyzacyjnej. Model systemowy człowieka i maszyny manipulacyjnej. Modele systemowe narządów ruchu człowieka. Model reologiczny mięśnia izolowanego. Model strukturalno-funkcjonalny napędów mięśniowych kończyn. Systemowe ujęcie głównych układów człowieka uczestniczących w ruchu. Bioniczne modele systemowe maszyn manipulacyjnych. Budowa maszyn manipulacyjnych i ich efektorów. Rodzaje maszyn manipulacyjnych i ich konstrukcji. Manipulatory maszyn manipulacyjnych: mechanizmy kinematyczne, układy napędowe, układy przeniesienia ruchu. Urządzenia sterujące: sterowniki sprzętowe i programowe, sensory mechanizmu kinematycznego i środowiska, układy komunikacyjne. Związek efektorów z zadaniem maszyny manipulacyjnej. Efektory maszyn manipulacyjnych w inżynierii biomedycznej. Opis i realizacja zadań ruchowych mechanizmów maszyn manipulacyjnych. Geometria, kinematyka i kinetyka mechanizmów maszyn manipulacyjnych. Układy współrzędnych opisu zachowań ruchowych maszyn manipulacyjnych. Transformacje układów. Proste i odwrotne zadania opisu zachowań ruchowych i dynamicznych mechanizmów maszyn manipulacyjnych. Planowanie trajektorii ruchu efektora maszyny manipulacyjnej. Wyznaczenie współrzędnych maszynowych w zadaniu odwrotnym - problemy wieloznaczności położeń mechanizmu, dokładności określenia współrzędnych maszynowych i żądanej orientacji efektora (zadanie projektowe) Wybrane zagadnienia zastosowań maszyn manipulacyjnych w inżynierii biomedycznej. Podstawowe pojęcia z zakresu biomechanizmów i biomanipulatorów Modelowanie i budowa protez, ortotez, manipulatorów rehabilitacyjnych i teleoperatorów manipulacyjnych. Budowa teleoperatora chirurgicznego jako typowego przykładu bionicznej maszyny manipulacyjnej: sensory sterowania mechanizmem, mechanizm i napędy maszyny, efektory, sterowniki, środki komunikacji i oprogramowanie. Inne przykłady robotyzacji zadań medycznych.",
     "assessment": "Dwa kolokwia",
     "literature": "Morecki A., Ekiel J., Fidelus K.: Cybernetyczne systemy ruchu kończyn i zwierząt I robotów, PWN, Warszawa 1979.\nCraig J. J.: Wprowadzenie do robotyki, Mechanika i sterowanie, WNT, Warszawa 1995.\nHeimann B., Gerth W., Popp K.: Mechatronika, Komponenty, metody, przykłady, PWN, Warszawa 2001.\nMorecki A. i in.: Podstawy robotyki, WNT (II wydanie), Warszawa 2002. Olszewski M. i in.: Mechatronika, REA, Warszawa 2002."
    },
    {
     "name": "Sensory i pomiary wielkości nieelektrycznych",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "hours": {
      "W": 30,
      "L": 15
     },
     "syllabusId": 900265,
     "code": "SiPWN",
     "coordinator": "prof. nzw. dr hab. inż. G. Cybulski",
     "exam": true,
     "prerequisites": "Znajomość elektrotechniki i podstaw elektroniki.",
     "goal": "Zdobycie podstawowych umiejętności w zakresie zasad działania, budowy i eksploatacji sensorów i systemów pomiarowych.",
     "content": "Podstawowe informacje o sensorach. Sensory biologiczne. Budowa, działanie i charakterystyka wybranych biosensorów. Bioczujniki immunologiczne. Miniaturowe układy do całościowej analizy chemicznej. Bioreaktory. Suche testy do szybkiej diagnostyki medycznej. Bioczujniki gazów. Biopotencjały i ich klasyfikacja. Elektrody i mikroelektrody. Zjawiska elektryczne na styku elektroda-tkanka. Pomiary z wykorzystaniem biosensorów elektrochemicznych. Immunosensory elektrochemiczne. Pomiary wybranych wielkości nieelektrycznych. Metody i aparatura do pomiaru składu chemicznego. Spektrofotometria absorpcyjna i spektrometria mas. Woltoamperometria, polarografia, metody jonoselektywne. Adsorpcja powierzchniowa. Chromatografia gazowa i cieczowa. Pomiary właściwości fizycznych: gęstości, lepkości, pH, wilgotności.",
     "assessment": "Egzamin i zaliczenie na podstawie ocen uzyskanych z poszczególnych ćwiczeń laboratoryjnych.",
     "literature": "1. Praca zbiorowa: Biocybernetyka i Inżynieria Biomedyczna 2000 (red. M. Nałęcz) t. 2 Biopomiary. Ak. Of. Wyd. EXIT Warszawa 2001.;\n2. Z. Dunajski: Biomagnetyzm. WKiŁ Warszawa, 1990;\n3.The measurement, instrumentation and sensors (John G. Webster – editor – in chief). CRC Press, USA 1999."
    },
    {
     "name": "Sygnały i systemy",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "hours": {
      "W": 30,
      "C": 15
     },
     "syllabusId": 900266,
     "code": "SIS",
     "coordinator": "Dr hab. inż. Kajetana Marta SNOPEK",
     "exam": false,
     "prerequisites": "Wymagana jest ugruntowana wiedza podstawowa z zakresu analizy matematycznej (całkowanie, różniczkowanie, obliczanie granic ciągów liczbowych i funkcji, rysowanie wykresów funkcji 1-wymiarowych). Student powinien mieć opanowane podstawy teorii obwodów oraz analizy częstotliwościowej przebiegów okresowych (szereg Fouriera).",
     "goal": "Celem przedmiotu jest zapoznanie studentów z szeroko rozumianymi podstawowymi pojęciami teorii sygnałów i systemów czasu ciągłego i dyskretnego oraz przekazanie wiadomości niezbędnych do samodzielnego studiowania przedmiotów specjalistycznych.",
     "content": "TREŚĆ WYKŁADU 1. Wprowadzenie do teorii sygnałów. Źródła i klasyfikacja sygnałów.Podstawowe parametry i operacje na sygnałach. Funkcja autokorelacji i splot. Sygnały dystrybucyjne. (3 h) 2. Wprowadzenie do teorii systemów. Cechy systemów. Systemy LS i ich równania \"wejście-wyjście\". Odpowiedź jednostkowa i impulsowa. Schematy blokowe. (3 h) 3.Zastosowanie przekształcenia Fouriera w analizie systemów czasu ciągłego. Charakterystyki częstotliwościowe. Filtry idealne. FiltryButterwortha, Czebyszewa, eliptyczne. (3h) 4. Próbkowanie i kwantowanie sygnałów. Widmo sygnału spróbkowanego.Odtwarzanie sygnału z próbek. Układy \"sample-and-hold\". Aliasing i filtracja antyaliasingowa. (4 h) 5. Przekształcenie Fouriera sygnałów czasu dyskretnego (DTFT). Zastosowanie DTFT w analizie systemów czasu dyskretnego systemu. Charakterystyka częstotliwościowa. Filtry idealne. (3 h) 6. Dyskretne przekształcenie Fouriera (DFT). Algorytm FFT. Przeciekwidma i okienkowanie. (3 h) 7. Jednostronne przekształcenie Z. Zastosowanie przekształcenia Z wanalizie systemów czasu dyskretnego. (2h) 8. Sygnały losowe czasu ciągłego. Twierdzenie Wienera- Chinczyna. Przykłady sygnałów losowych czasu ciągłego. Przejście sygnału losowego czasu ciągłego przez układ LS. Funkcja korelacji wzajemnej i wzajemne widmo gęstości mocy. (3 h) 9. Sygnały losowe czasu dyskretnego. Twierdzenie Wienera-Chinczyna. Przykłady sygnałów losowych czasu dyskretnego. Przejście sygnału losowego czasu dyskretnego przez układ LS. Funkcja korelacji wzajemnej i wzajemne widmo gęstości mocy. (3 h) 10. Wprowadzenie do teorii przekształceń \"czas- częstotliwość\" i \"czas-skala\". (3 h) TREŚĆ ĆWICZEŃ 1. Szereg Fouriera (1 h) 2. Parametry sygnałów, splot (2 h) 3. Zastosowanie przekształcenia Fouriera w analizie systemów analogowych w stanie ustalonym (2 h) 4. Systemy LS (2 h) 5. Próbkowanie sygnałów (2 h) 6. DTFT i jego zastosowanie w analizie systemów czasu dyskretnego (2 h) 7. Przekształcenie Z w analizie systemów czasu dyskretnego (2 h) 8. Sygnały losowe (2 h)",
     "assessment": "Na ćwiczeniach audytoryjnych studenci zdobywają podstawowe umiejętności rozwiązywania zadań z zakresu teorii sygnałów i systemów, które powinny być pogłębiane indywidualnie i z pomocą prowadzących przedmiot w ramach konsultacji. Stopień opanowania wiedzy oceniany jest podczas dwóch pisemnych sprawdzianów audytoryjnych (Spr1 i Spr2).\nW ramach wykładu są przeprowadzane dwa kolkowia",
     "literature": "Literatura podstawowa:\n[1] Szabatin, Podstawy teorii sygnałów, WKiŁ,Warszawa 2000.\n[2] Wojciechowski, Sygnały i systemy, WKiŁ,Warszawa 2008.\n[3] K. Snopek, J. Wojciechowski, Sygnały i systemy - zbiór zadań, Oficyna Wydawnicza PW, Warszawa 2009\n\nLiteratura uzupełniająca:\n[4] S. Haykin, Systemy telekomunikacyjne, WKiŁ,Warszawa 1998.\n[5] A.Papoulis, Obwody i układy, WKiŁ, Warszawa 1988.\n[6] T. Zieliński, Cyfrowe przetwarzanie sygnałów,WKiŁ, Warszawa 2005."
    },
    {
     "name": "Wstęp do systemów elektroniki wbudowanej",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 5,
     "hours": {
      "W": 30,
      "L": 30
     },
     "syllabusId": 900270,
     "code": "WSELE",
     "coordinator": "Jakub Jasiński",
     "exam": false,
     "prerequisites": "Wymagana jest wiedza z elektroniki i elektrotechniki na poziomie 4 semestru studiów na kierunku Inżynieria Biomedyczna (nabyta na przedmiotach Metrologia, Elektrotechnika i Elektronika 1)",
     "goal": "Celem przedmiotu jest zapoznanie studentów z podstawowymi właściwościami oraz zastosowaniami elektroniki cyfrowej oraz podstawowymi właściwościami i zastosowaniami systemów wbudowanych. Zapoznanie studentów z budową i działaniem mikroprocesora, systemu mikroprocesorowego oraz mikrokontrolera, a także podstawowymi operacjami realizowanymi przez mikrokontrolery. Ukształtowanie u studentów elementarnych umiejętności programowania mikrokontrolerów w zakresie tworzenia i uruchamiania prostych programów w języku asembler.",
     "content": "Celem przedmiotu jest zapoznanie studentów z podstawowymi właściwościami oraz zastosowaniami elektroniki cyfrowej oraz podstawowymi właściwościami i zastosowaniami systemów wbudowanych. Zapoznanie studentów z budową i działaniem mikroprocesora, systemu mikroprocesorowego oraz mikrokontrolera, a także podstawowymi operacjami realizowanymi przez mikrokontrolery. Ukształtowanie u studentów elementarnych umiejętności programowania mikrokontrolerów w zakresie tworzenia i uruchamiania prostych programów w języku asembler.\n\nTreść wykładu\n\nWprowadzenie. Podstawowe zagadnienia elektroniki analogowej i cyfrowej. Algebra Boole’a. Podstawowe bramki logiczne (NOT, AND, OR). Konstrukcja inwertera w technologii bulk-CMOS. Kierunki rozwoju i ograniczenia technologii podłożowej.\nOmówienie budowy złożonych układów logicznych: bramki NAND, NOR oraz XOR, półsumator, sumator 1-bitowy. Kod uzupełnień do dwóch (U2) – działania ze znakiem.\nOmówienie budowy układów realizujących działania arytmetyczne (sumator, subtraktor) i logiczne. Konstrukcja układów generujących sygnał przeniesienia w układach sumatora/subtraktora.\nWprowadzenie terminu jednostki arytmetyczno-logicznej (ALU). Przykłady realizacji układowej komercyjnie dostępnych jednostek arytmetyczno-logicznych. Omówienie ich tablic prawdy.\nWprowadzenie pojęcia „komórki pamięci”. Przerzutniki asynchroniczne i synchroniczne. Szczegółowe omówienie działania przerzutnika typu RS, JK i D. Budowa rejestru. Porty trójstanowe.\nKomunikacja pomiędzy rejestrami – wprowadzenie pojęcia szyny systemowej.\nPrzykład budowy prostego systemu mikroprocesorowego w oparciu o wprowadzone i omówione na poprzednich wykładach elementy składowe: rejestr, szyna, jednostka arytmetyczno-logiczna, pamięć.\nOmówienie budowy i działania rejestrów wejścia/wyjścia.\nKod maszynowy i język asembler.\nWprowadzenie pojęcia przerwania i systemu przerwań. Omówienie działania systemu operacyjnego opartego o pętlę sterowaną przerwaniem zegarowym. Obsługa przerwań oraz działanie mikrokontrolera w wielozadaniowym systemie czasu rzeczywistego (priorytety przerwań oraz wywłaszczenia).\nOmówienie budowy i działania rzeczywistych mikrokontrolerów na przykładzie klasycznego mikrokontrolera MCS-51 oraz współczesnych układów zgodnych architekturą z rodziną ’51.\n\nZakres laboratorium\n\nWprowadzenie do systemu uruchomieniowego i środowiska programistycznego - tworzenie projektów, praca krokowa, zastawianie pułapek (tzw. breakpoint), sposoby uruchamiania programów, symulator, szablony programów. Omówienie działania pierwszego prostego programu.\nZasoby mikrokontrolera i podstawowe struktury programu. Sposoby dostępu do zasobów mikrokontrolera – pamięci adresowanej pośrednio, bezpośrednio oraz bitowo, banków rejestrów roboczych oraz rejestrów funkcji specjalnych (SFR).\nOperacje arytmetyczne i logiczne - operacje dodawania, odejmowania, mnożenia i dzielenia. Przekształcanie liczb: z binarnej w dziesiętną i hexadecymalną oraz z zapisu szesnastkowego i dziesiętnego na dwójkowy. Zapis liczb w kodzie uzupełnień do dwóch.\nKomunikacja z prostymi urządzeniami wejścia/wyjścia, realizacja pętli programowej oraz instrukcji skoku. Instrukcje warunkowe. Przepisywanie bloku danych.\nStos. Wywoływanie procedur, procedura obsługi przerwania.\nProgram realizujący miganie diodą elektroluminescencyjną wykorzystujący przerwanie od wbudowanego układu licznikowego.\nOprogramowanie 5-pozycyjnego, 7 segmentowego wyświetlacza LED w trybie multipleksowanym. Zaprogramowana funkcjonalność ma realizować efekt „płynącego tekstu”, dłuższego niż ilość pozycji wyświetlacza.",
     "assessment": "Kolokwia, zaliczanie ćwiczeń laboratoryjnych (sprawozdania. kartkówki)",
     "literature": "R. Pełka, Mikrokontrolery - architektura, programowanie, zastosowanie, WKŁ, Warszawa 1999.\nP. Misiurewicz, Podstawy techniki mikroprocesorowej, WNT, 1991.\nP. Hadam, Projektowanie systemów mikroprocesorowych, BTC, Warszawa 2006.\nW. Daca, Mikrokontrolery od układów 8-bitowych do 32-bitowych, MIKOM, 2000.\nT. Starecki, Mikrokontrolery 8051 w praktyce, BTC, Warszawa 2002."
    }
   ]
  },
  {
   "number": 5,
   "courses": [
    {
     "name": "Programowalne Układy Logiczne",
     "block": "Aparatura Medyczna",
     "group": "Specjalnościowe",
     "ects": 3,
     "hours": {
      "W": 15,
      "L": 30
     },
     "syllabusId": 900308,
     "code": "PULOG",
     "coordinator": "dr hab. inż. Jakub Żmigrodzki",
     "exam": false,
     "prerequisites": "Podstawy automatyki, Elektronika 1, Elektronika 2",
     "goal": "Celem przedmiotu jest przekazanie podstawowej wiedzy i umiejętności dotyczących projektowania urządzeń/systemów cyfrowych implementowanych w logicznych układach programowalnych (PLD - Programmable Logic Devices).",
     "content": "Wykład\nCelem wykładu jest ugruntowanie i rozszerzenie wiedzy studentów dotyczącej podstaw techniki cyfrowej oraz wprowadzenie nowych pojęć i zagadnień specyficznych dla projektowania układów cyfrowych z wykorzystaniem programowalnych układów logicznych.\nRamowy plan wykładu:\n1. Cyfrowe układy kombinacyjne (1h),\n2. Cyfrowe układy sekwencyjne (1h),\n3. Podstawowe bloki cyfrowe(1h),\n4. Właściwości cyfrowych układów scalonych (4h),\n5. Cyfrowy zapis informacji - kody liczbowe (1h),\n6. Programowalne układy logiczne (PLD) – informacje podstawowe budowy i parametrów użytkowych (1h)\n7. Projektowanie i testowanie urządzeń/systemów cyfrowych implementowanych w programowalnych układach logicznych (PLD). Etapy tworzenia projektu z wykorzystaniem programów EDA (Electronic Design Automation) (2h).\n8. Wprowadzenie do projektowania programowalnych układów logicznych z wykorzystaniem języka VHDL (5h)\nLaboratorium\nCelem laboratorium jest nabycie przez studentów umiejętności tworzenia i weryfikacji poprawności projektów urządzeń/systemów cyfrowych implementowanych w programowalnych układach logicznych (PLD) z wykorzystaniem środowiska Quartus II (Altera).\n\nLaboratorium jest podzielone na dwie części:\n1. Tutorial - w którym studenci tworzą układ miernika częstotliwości jednocześnie zapoznając się w praktyczny sposób z większością narzędzi środowiska QuartusII oraz sposobem projektowania w tym środowisku.\n2. Zadania laboratoryjne - w których studenci samodzielnie rozbudowują o nowe funkcje projekt z pierwszej części tutorialowej. Ta część laboratorium ma na celu utrwalenia i pogłębienia wiadomości i umiejętności zdobytych w ramach przedmiotu. Dodatkowo studenci mogą rozwijać umiejętności pracy zespołowej oraz rozwiązywania problemów inżynierskich.",
     "assessment": "kolokwium oraz ocena bieżąca zadań realizowanych podczas zajęć laboratoryjnych.",
     "literature": "1. Język VHDL : projektowanie programowalnych układów logicznych; Kevin Skahill; Warszawa; WNT; 2004.\n2. Projektowanie złożonych układów cyfrowych; Marek Pawłowski, Andrzej Skorupski; Warszawa, WKŁ, 2010.\n3. Podstawy elektroniki cyfrowej; Józef Kalisz; Warszawa, WKŁ, 2007.\n4. Wprowadzenie do języka VERILOG; Zbigniew Hajduk; Legionowo, BTC, 2009.\n5. Układy FPGA w przykładach; Jacek Majewski, Piotr Zbysiński; Warszawa; BTC, 2007.\n6. Podstawy techniki cyfrowej; Andrzej Skorupski; Warszawa, WKŁ, 2004.\n7. Układy cyfrowe; Wojciech Głowacki; Warszawa, Wydawnictwo Szkolne i Pedagogiczne, 1998.\n8. Projektowanie układów cyfrowych z wykorzystaniem języka VHDL; Mark Zwoliński; Warszawa, WKŁ, 2007.\n9. Portal firmy Intel - http://www.intel.com\n10. Portal firmy Xilinx - http://www.xilinx.com/"
    },
    {
     "name": "Technika mikroprocesorowa",
     "block": "Aparatura Medyczna",
     "group": "Specjalnościowe",
     "ects": 4,
     "hours": {
      "W": 30,
      "L": 15
     },
     "syllabusId": 900307,
     "code": "TEMI",
     "coordinator": "Grzegorz Domański",
     "exam": true,
     "prerequisites": "Przedmiot ELE2",
     "goal": "Celem przedmiotu jest nauczenie studentów programowania mikroprocesorów i mikrokontrolerów w języku wysokiego poziomu ze szczególnym uwzględnieniem układów 32-bitowych z rdzeniem ARM. Studenci mają możliwość praktycznej weryfikacji nabytych umiejętności podczas zajęć laboratoryjnych.",
     "content": "Przegląd współczesnych architektur mikroprocesorów i mikrokontrolerów. Systemy wbudowane (2h). Rdzeń ARM. Rodzina STM32. Architektura procesorów rodziny STM32 (2h). Programowanie mikrokontrolerów w języku wysokiego poziomu – C/C++. Środowiska programistyczne – Keil uVision, Atollic True Studio, STM32CubeMX. Narzędzia testowe i uruchomieniowe (4h). Uruchamianie mikrokontrolera. Opis magistral wewnętrznych oraz sygnałów zegarowych. Konfiguracja sprzętowa. Inicjalizacja zmiennych, wskaźników stosu, kodu oraz układów peryferyjnych. Ustawienie priorytetów i masek przerwań. Włączenie obsługi przerwań. Zasadniczy kod programu (4h). Porty IO - budowa, konfiguracja, wykorzystanie. Współpraca z pamięciami (SRAM, FLASH, SDRAM) (4h). System przerwań. Układy licznikowe, PWM. Układy czuwające (4h). Układ DMA. Tryby obniżonego poboru mocy. Interfejsy szeregowe: USART, SPI, I2C, I2S, CAN, TWI (5h). Przetworniki A/C, C/A. Magistrala USB. Ethernet. Systemy czasu rzeczywistego (FreeRTOS) (4h). Przykłady innych języków programowania mikrokontrolerów – MicroPython (1h). Tematy laboratoriów:\n1. Konfiguracja i uruchomienie mikrokontrolera. Sterowanie i odczyt linii portów we/wy (3h)\n2. Obsługa klawiatury i wyświetlacza (3h)\n3. Układy licznikowe, pomiar czasu i częstotliwości, wytwarzanie sygnałów cyfrowych (3h)\n4. Przetworniki A/C i C/A, wytwarzanie sygnałów analogowych (3h)\n5. Obsługa interfejsów szeregowych, RS232, USB (3h).\nW ramach zajęć laboratoryjnych studenci wykorzystują gotowe funkcje biblioteczne oraz piszą własne funkcje i programy.",
     "assessment": "egzamin\nocena ćwiczeń laboratoryjnych",
     "literature": "1. K. Paprocki, Mikrokontrolery STM32 w praktyce, BTC 2009\n2. M. Galewski, STM32. Aplikacje i ćwiczenia w języku C, BTC 2011\n3. M. Peczarski, Mikrokontrolery STM32 w sieci Ethernet w przykładach, BTC 2011\n4. M. Szumski, Mikrokontrolery STM32 w systemach sterowania i regulacji, BTC 2017\n5. Noty katalogowe firmy ST."
    },
    {
     "name": "Układy elektroniczne",
     "block": "Aparatura Medyczna",
     "group": "Specjalnościowe",
     "ects": 5,
     "hours": {
      "W": 30,
      "L": 15,
      "P": 15
     },
     "syllabusId": 900306,
     "code": "UEL",
     "coordinator": "Wojciech Obrębski",
     "exam": true,
     "prerequisites": "Elektronika 1, Elektronika 2, Sygnały i systemy",
     "goal": "Nauczenie studentów projektowania układów elektronicznych ze szczególnym uwzględnieniem układów elektroniki medycznej.",
     "content": "Wykład:\n1. Projektowanie analogowych torów wejściowych/wyjściowych urządzeń medycznych (13h)\na. przypomnienie podstaw i specyfika pomiarów (5h)\ni. wzmacniacze operacyjne w podstawowych konfiguracjach (odwracający i nieodwracający, sumator, wzmacniacz różnicowy, przetwornik I/U) (2h)\nii. odbiór sygnału bioelektrycznego - elektrody, model sygnału, impedancja źródła (1h)\niii. wzmacniacz instrumentalny (1h)\niv. bezpieczeństwo elektryczne i metody realizacji izolacji galwanicznej (1h)\nb. Projektowanie stopnia wejściowego/wyjściowych (do wyboru układy EKG, EMG, EEG, pomiaru bioimpedancji, stymulacji elektrycznej) (8h)\ni. wybór architektury z uwzględnieniem wpływu podstawowych parametrów aplikacyjnych, odniesienie do not katalogowych elementów elektronicznych (2h)\nii. analiza charakterystyki częstotliwościowej oraz stabilność układu (2h)\niii. analiza szumowa (2h)\niv. komputerowa symulacja DC, AC, NOISE, TRAN z uwzględnieniem badania stabilności układu (2h)\n2. Przetwarzanie cyfrowe sygnałów bioelektrycznych (8h)\na. Przetworniki AC/CA: rodzaje, właściwości, dobór do aplikacji, właściwości szumowe, poprawa właściwości poprzez dithering i nadpróbkowanie (2h)\nb. Filtracja cyfrowa: algorytmy prostego uśredniania jako najprostsze realizacja filtrów SOI/NOI dolno-, górno-, i środkowoprzepustowych, arytmetyka stałoprzecinkowa w filtrach cyfrowych, metody syntezy filtrów SOI/NOI (4h)\nc. Cyfrowa detekcja kwadraturowa (2h)\n3. Metody prototypowania i wytwarzania układów elektronicznych (4h)\na. Technologie obwodów drukowanych, komponentów RLC, montaż SMD i THT. Komputerowe projektowanie obwodów drukowanych (typowy przebieg procesu projektowania) (1.5h)\nb. Zakłócenia w układach elektronicznych i sposoby ich minimalizacji, projektowanie obwodów PCB z uwzględnieniem wysokich częstotliwościm, podstawowe linie transmisyjne (2.5h)\nLaboratorium:\n1. Wprowadzenie do systemu uruchomieniowego NI ELVIS, myDaq oraz prototypowania na płytkach breadboard. (2h)\n2. Wzmacniacz operacyjny w podstawowych konfiguracjach: wtórnik napięciowy, wzmacniacz odwracający, sumator, wzmacniacz różnicowy, przetwornik I/U. (3h)\n3. Stopnie wejściowe wzmacniaczy sygnałów bioelektrycznych w tym wpływ elektrody aktywnej (zwrotne) na CMRR (3h)\n4. Przetwarzanie sygnałów analogowych: przetworniki AC/CA (3h)\n5. Filtry aktywne analogowe i filtry cyfrowe (3h)\n6. Własności szumowe wzmacniaczy (3h)\n7. Detekcja kwadraturowa na przykładzie miernika bio-impedancji (3h)\nProjekt:\nStudenci realizują jeden projekt dwuetapowo. Pierwszy etap to opracowanie schematu elektrycznego układu elektronicznego (rysunek odręczny, poparty podstawowymi obliczeniami dotyczącymi: punktu pracy, wzmocnienia, charakterystyki częstotliwościowej, stabilności pracy, szumów) oraz symulacja jego działania w środowisku SPICE.\nDrugim etapem jest realizacja fizyczna na breadbordach zestawów NI ELVIS lub na zaprojektowanej płytce PCB. W tym etapie przewidywane jest uruchomienie zaprojektowanego układu i wykonanie badań charakterystyk wcześniej symulowanych w SPICE.\nDo dyspozycji studentów są zestawy NI ELVIS i myDaq oraz płytki breadboard. Ponadto studenci będą mieć dostęp do podstawowych narzędzi warsztatowych w tym: lutownic, multimetrów, oscyloskopów, generatorów i zasilaczy.\nPrzykładowe klasy tematów projektów:\n1. jednokanałowe odbiorniki sygnałów bioelektrycznych,\n2. wektorowe mierniki bioimpedancji\n3. elektryczne stymulatory pacjenta\n4. przetwornice zasilające, minimalizacja zakłóceń\n5. filtry aktywne do kształtowania charakterystyki częstotliwościowej sygnału",
     "assessment": "egzamin\nocena sprawozdań laboratoryjnych i projektowych",
     "literature": "• David Prutchi, Michael Norris, Design and Development of Medical Electronic Instrumentation: A Practical Perspective of the Design, Construction, and Test of Medical Devices, Wiley, 2005\n• Henry W. Ott, Electromagnetic Compatibility Engineering, Wiley, 2009\n• Tomasz P. Zieliński, Cyfrowe przetwarzanie sygnałów. Od teorii do zastosowań, WKŁ, 2014\n• Paul Horowitz, Winfield Hill, Sztuka elektroniki, WKŁ, 2018"
    },
    {
     "name": "Akceleratory biomedyczne",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 2,
     "hours": {
      "W": 15,
      "L": 15
     },
     "syllabusId": 900304,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Akwizycja i przetwarzanie danych z wykorzystaniem LabVIEW",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "syllabusId": 900293,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Analiza danych pomiarowych w medycynie",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "syllabusId": 900301,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Biometryczna identyfikacja tożsamości",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 4,
     "syllabusId": 900299,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Detekcja promieniowania jonizującego",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "syllabusId": 900286,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Informatyczne systemy medyczne",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 4,
     "syllabusId": 900291,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Kontrola Jakości Radiologicznych Urządzeń Diagnostycznych",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "hours": {
      "W": 15,
      "L": 15
     },
     "syllabusId": 900282,
     "code": "OB",
     "coordinator": "dr hab. inż. Piotr Tulik",
     "exam": false,
     "prerequisites": "Podstawowa wiedza z zakresu: oddziaływania promieniowania jonizującego z materią; metod obrazowania medycznego wykorzystujących promieniowanie jonizujące oraz ochrony radiologicznej; zaliczony przedmiot Radiologia.",
     "goal": "Zdobycie wiedzy, umiejętności praktycznych oraz kompetencji społecznych w zakresie kontroli jakości radiologicznych urządzeń diagnostycznych. Przygotowanie do pracy: w jednostkach przeprowadzających kontrolę jakości radiologicznych urządzeń diagnostycznych; na stanowiskach inżynierskich, instalujących oraz serwisujących radiologiczne urządzenia diagnostyczne.",
     "content": "Zakres wykładu obejmuje:\nPodstawy prawne zagadnienia kontroli jakości urządzeń diagnostycznych .\nOkreślenia i pojęcia użyte w testach specjalistycznych i testach podstawowych w rentgenodiagnostyce i radiologii zabiegowej.\nTesty podstawowe (kryteria, częstotliwość, stosowana aparatura, metodyka przeprowadzania):\n- urządzeń stosowanych w radiografii ogólnej analogowej\n- urządzeń stosowanych w radiografii ogólnej cyfrowej (CR i DR)\n- urządzeń stosowanych we fluoroskopii i angiografii\n- urządzeń stosowanych w tomografii komputerowej\n- urządzeń stosowanych w stomatologicznej tomografii komputerowej wiązki stożkowej\n- urządzeń stosowanych w mammografii analogowej\n- urządzeń stosowanych w mammografii cyfrowej\n- urządzeń stosowanych w stomatologii (aparaty do zdjęć wewnątrzustnych, pantomograficznych oraz cefalometrii)\n- urządzeń stosowanych w densytometrii kostnej\n- monitorów stosowanych w stacjach przeglądowych i opisowych\n- drukarek stosowanych do tworzenia kopii cyfrowych obrazów medycznych.\nTesty specjalistyczne (kryteria, częstotliwość, stosowana aparatura, metodyka przeprowadzania):\n- urządzeń stosowanych w radiografii ogólnej analogowej\n- urządzeń stosowanych w radiografii ogólnej cyfrowej\n- urządzeń stosowanych we fluoroskopii i angiografii\n- urządzeń stosowanych w tomografii konwencjonalnej\n- urządzeń stosowanych w tomografii komputerowej\n- urządzeń stosowanych w stomatologicznej tomografii komputerowej wiązki stożkowej\n- urządzeń stosowanych w mammografii analogowej\n- urządzeń stosowanych w mammografii cyfrowej\n- urządzeń stosowanych w stomatologii (aparaty do zdjęć wewnątrzustnych, pantomograficznych oraz cefalometrii)\n- monitorów stosowanych w stacjach przeglądowych i opisowych\n\nOkreślenia i pojęcia użyte w testach specjalistycznych i testach podstawowych w medycynie nuklearnej.\n\nTesty podstawowe (kryteria, częstotliwość, stosowana aparatura, metodyka przeprowadzania):\n- mierników aktywności bezwzględnej\n- zestawów do pomiaru jodochwytności tarczycy\n- liczników scyntylacyjnych do pomiaru promieniowania gamma in vitro\n- sond do pomiarów śródoperacyjnych\n- planarnych kamer scyntylacyjnych\n- kamer SPECT i SPECT/CT\n- skanerów PET i PET/CT\n\nTesty specjalistyczne (kryteria, częstotliwość, stosowana aparatura, metodyka przeprowadzania):\n- mierników aktywności bezwzględnej\n- planarnych kamer scyntylacyjnych\n- kamer SPECT i SPECT/CT\n\nZakres zajęć laboratoryjnych obejmuje:\nWykonanie testów podstawowych:\n- urządzeń stosowanych w radiografii ogólnej analogowej\n- urządzeń stosowanych w radiografii ogólnej cyfrowej (CR i DR)\n- urządzeń stosowanych we fluoroskopii i angiografii\n- monitorów stosowanych w stacjach przeglądowych i opisowych\nWykonanie testów specjalistycznych:\n- urządzeń stosowanych w radiografii ogólnej analogowej\n- urządzeń stosowanych w radiografii ogólnej cyfrowej\n- urządzeń stosowanych we fluoroskopii i angiografii\n- monitorów stosowanych w stacjach przeglądowych i opisowych\nZapoznanie się z metodyką przeprowadzania testów podstawowych i specjalistycznych oraz stosowaną w tych testach aparatura:\n- urządzeń stosowanych w tomografii komputerowej\n- urządzeń stosowanych w stomatologicznej tomografii komputerowej wiązki stożkowej\n- urządzeń stosowanych w mammografii analogowej\n- urządzeń stosowanych w mammografii cyfrowej\n- urządzeń stosowanych w stomatologii\n- mierników aktywności bezwzględnej\n- planarnych kamer scyntylacyjnych\n- kamer SPECT i SPECT/CT\n- skanerów PET i PET/CT\nWykonanie oceny wyników wybranych testów podstawowych i specjalistycznych:\n- mierników aktywności bezwzględnej\n- planarnych kamer scyntylacyjnych\n- kamer SPECT i SPECT/CT\n- skanerów PET i PET/CT",
     "assessment": "wykład - zaliczenie na podstawie kolokwium;\nlaboratorium - zaliczenie na podstawie sprawdzianów i sprawozdań;",
     "literature": "Obwieszczenie Ministra Zdrowia z dnia 3 kwietnia 2017 r. w sprawie ogłoszenia jednolitego tekstu rozporządzenia Ministra Zdrowia w sprawie warunków bezpiecznego stosowania promieniowania jonizującego dla wszystkich rodzajów ekspozycji medycznej. Dziennik Ustaw 2017 poz. 884 tom 1\nAmerican Association of Physicists in Medicine, AAPM (1995) Report No. 52: Quantitation of SPECT performance. American Institute of Physics, New York\nInternational Atomic Energy Agency, IAEA (2009) Human Health Series No. 1: Quality assurance for PET and PET/CT systems, International Atomic Energy Agency, Vienna\nInternational Atomic Energy Agency, IAEA (2009) Quality assurance for SPECT systems. Human Health Series No. 6. International Atomic Energy Agency, Vienna\nNational Electrical Manufacturers Association, NEMA (2001, 2007) Standards Publication NU 1: Performance Measurements of Scintillation Cameras. NEMA, Rosslyn, VA\nNational Electrical Manufacturers Association, NEMA (1994, 2001, 2007, 2012) Standard Publication NU 2: Performance measurements of positron emission tomographs. NEMA, Rosslyn, VA\nInternational Electrotechnical Commission, IEC (1998, 2008, 2013) Radionuclide Imaging Devices ? Characteristics and Test Conditions - Part 1: Positron Emission Tomographs, IEC 61675-1, IEC, Geneva\nInternational Electrotechnical Commission, IEC (2005) Nuclear medicine instrumentation ? Routine tests ? Part 3: Positron emission tomographs, IEC/TR 61948, IEC, Geneva\nE. Busemann Sokole, A. Płachcínska, A. Britten, EANM Physics Committee: Acceptance testing for nuclear medicine instrumentation, Eur J Nucl Med Mol Imaging, 37(3), 2010, 672?681.\nEANM Physics Committee, E. Busemann Sokole, A. Płachcínska, A. Britten, EANM Working Group on Nuclear Medicine Instrumentation Quality Control, M. Lyra Georgosopoulou, W. Tindale, R. Klett: Routine quality control recommendations for nuclear medicine instrumentation, Eur J Nucl Med Mol Imaging, 37(7), 2010, 662?671.\nWitold Skrzyński, Wioletta Ślusarczyk-Kacprzyk: Testy podstawowe monitorów stosowanych do prezentacji obrazów medycznych. Pol J Med Phys Eng 2013;19(1):1-14. PL ISSN 1425-4689 doi: 10.2478/pjmpe-2013-0001.\nWitold Skrzyński, Wioletta Ślusarczyk-Kacprzyk: Testy specjalistyczne monitorów stosowanych do prezentacji obrazów medycznych. Pol J Med Phys Eng 2013;19(1):15-33. PL ISSN 1425-4689 doi: 10.2478/pjmpe-2013-0002.\nStanowisko Sekcji Fizyki przy Polskim Towarzystwie Medycyny Nuklearnej w sprawie zalecanych rodzajów, sposobu przeprowadzania oraz częstości procedur kontrolnych aparatury używanej przez pracownie medycyny nuklearnej: http://www.ptmn.pl/sekcjafizyk/testy_20062013.pdf\nTomaszuk M, Kabat D, Lenda-Tracz W. Przegląd zaleceń dotyczących kontroli jakości systemów PET - kierunek zmian. Inżynier i Fizyk Medyczny, 4(3), 2015, 123-132"
    },
    {
     "name": "Metoda elementów skończonych – zastosowanie w bioinżynierii",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "syllabusId": 900300,
     "code": "114A-IBxxx-ISP-MES",
     "coordinator": "dr inż. Konrad Kamieniecki",
     "exam": false,
     "prerequisites": "Mechanika Ogólna, Wytrzymałość Materiałów, Matematyka, Fizyka.",
     "goal": "Celem przedmiotu jest poznanie metody elementów skończonych jako narzędzia służącego przybliżaniu rozwiązania różnorodnych problemów fizycznych, w tym zagadnień biomechanicznych, przepływ ciepła, mechaniki strukturalnej i analizy problemów nieliniowych. W ramach przedmiotu studenci poznają arkana teoretyczne MES oraz zdobywają praktykę w rozwiązywaniu i analizowaniu modeli numerycznych, przeliczonych przy wykorzystaniu oprogramowania ANSYS.",
     "content": "Wykład: Wprowadzenie do Metody Elementów Skończonych (MES), inżynierskie i naukowe przykłady zastosowania MES w bioinżynierii. Koncepcja elementu skończonego na przykładzie elementu belkowego. Analiza liniowa statyczna, liniowy model materiałowy. Analiza nieliniowa statyczna, biliniowy model materiałowy, rodzaje nieliniowości. Analiza termiczna, rozwiązywanie pola rozkładu temperatury. Analiza dynamiczna: modalna oraz harmoniczna. Analiza zmęczeniowa wysoko-cyklowa.\nLaboratorium: wprowadzenie do środowiska ANSYS, definicja geometrii, definicja siatki elementów skończonych, definicja warunków brzegowych, rozwiązanie modelu oraz analiza wyników. Rozwiązanie modelu liniowego statycznego, rozwiązanie modelu nieliniowego statycznego, rozwiązanie zagadnienia dynamiki liniowej.",
     "assessment": "Kolokwium z treści wykładowych oraz zrealizowanie zadania projektowego podczas laboratorium komputerowego. Ocena końcowa jest średnią ważoną ocen z kolokwium (0.4) oraz z laboratorium (0.6).",
     "literature": "1. M. Bijak-Żochowski, Mechanika materiałów i konstrukcji. Oficyna Wydawnicza Politechniki Warszawskiej, 2013\n2. Zienkiewicz, Olgierd Cecil. Metoda elementów skończonych. 1972.\n3. Bathe, Klaus-Jürgen. Finite element procedures. Klaus-Jurgen Bathe, 2006."
    },
    {
     "name": "Napędy elektromechaniczne urządzeń mechatronicznych",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "syllabusId": 900285,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Podstawy biostatystyki",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 5,
     "syllabusId": 900284,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Podstawy modelowania w medycynie",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 2,
     "syllabusId": 900290,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Programowanie i analiza danych w R",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "syllabusId": 900288,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Projektowanie obwodów drukowanych – program PADS",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 4,
     "syllabusId": 900289,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Projektowanie wyrobów medycznych",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "syllabusId": 900297,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Przyrządy optyczne w medycynie",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "syllabusId": 900287,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Przyrządy w elektroterapii serca",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "syllabusId": 900298,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Systemy długotrwałego monitorowania",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 2,
     "syllabusId": 900295,
     "code": "SYMON",
     "coordinator": "prof. dr hab. inż. Gerard Cybulski",
     "exam": false,
     "prerequisites": "Znajomość układów elektronicznych, elektrotechniki, metod pomiaru wielkości elektrycznych i nieelektrycznych, znajomość fizykomedycznych podstaw inżynierii biomedycznej",
     "goal": "Zapoznanie z systemami medycznymi przeznaczonymi do długotrwałego monitorowania sygnałów biologicznych podczas codziennej aktywności pacjenta.",
     "content": "Wykłady obejmują następujące zagadnienia:\n• Znaczenie monitorowania ambulatoryjnego.. Rys historyczny technik holterowskich. Typy rejestratorów: taśmowe, wykorzystujące karty pamięci. Sygnały biologiczne podlegające długotrwałemu monitorowaniu.\n• Elektrody do odbioru sygnałów bioelektrycznych. Model elektryczny elektrody. Problemy w odbiorze sygnałów biologicznych w technice holterowskiej na przykładzie sygnału EKG. Parametry próbkowania, eliminacja zakłóceń.\n• Systemy odtwarzająco - analizujące. Analizowane parametry sygnału EKG. Wykrywanie zdarzeń w EKG. Arytmia, niedokrwienie, kontrola stymulatorów, zmienność rytmu serca, Zasady klasyfikacji sygnałów , algorytmy, bazy danych służące do weryfikacji algorytmów.\n• Urządzenia i metody do długotrwałej analizy sygnałów EEG.\n• Urządzenia i metody do nieinwazyjnych pomiarów ciśnienia tętniczego krwi: punktowego i ciągłego (Portapres).\n• Holter hemodynamiczny. Reokardiografia ambulatoryjna. Monitorowane parametry, Stosowane urządzenia (certyfikaty), ograniczenia, zastosowania kliniczne.\n• Urządzenia i metody do długotrwałego pomiaru uśrednionej aktywności mięśniowej AEMG\n• Perspektywy rozwoju techniki holterowskiej.\n• Polifizjografy, analizatory bezdechu sennego, oxyholtery\n• Monitorowanie funkcjonowania urządzeń wszczepialnych",
     "assessment": "ocena z testów",
     "literature": "• Barbara Dąbrowska, Andrzej Dąbrowski, Ryszard Piotrowicz. Elektrokardiografia holterowska. Via Medica - Wydawnictwo Medyczne, 2004 Gdańsk\n• Maciej Nałęcz. (red) Biocybernetyka i Inżynieria Biomedyczna 2000 t. 2 Biopomiary. EXIT Warszawa 2001\n• Khandpur RS. Biomedical instrumentation. Technology and applications. McGraw-Hill, 2005.\n• Northrop R. Analysis and Application of Analog Electronic Circuits to Biomedical Instrumentation CRC, 2004\n• Aston R.: Principles of Biomedical Instrumentation and Measurement. Merrill Publ. Comp. Columbus 1990.\n• John G. Webster (Editor – in chief). Medical Instrumentation Applications and Design. John Willey and Sons, 2010.\n• Shakti Chatterjee and Aubert Miller. Biomedical Instrumentation Systems. Delmar Pub, 2010\n• John G. Webster (Editor – in chief). Bioinstrumentation, John Willey and Sons, 2004\n• Gerard Cybulski. Ambulatory Impedance Cardiography. The Systems and their Applications. Series: Lecture Notes in Electrical Engineering, Vol. 76, 1st Edition, 2011, ISBN: 978-3-642-11986-6, Springer-Verlag Berlin and Heidelberg GmbH & Co. KG\n\nSana F, Isselbacher EM, Singh JP, Heist EK, Pathik B, Armoundas AA. Wearable Devices for Ambulatory Cardiac Monitoring: JACC State-of-the-Art Review. J Am Coll Cardiol. 2020 Apr 7;75(13):1582-1592. doi: 10.1016/j.jacc.2020.01.046. PMID: 32241375; PMCID: PMC7316129."
    },
    {
     "name": "Technika ultradźwiękowa w diagnostyce medycznej",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "hours": {
      "W": 15,
      "L": 15
     },
     "syllabusId": 900294,
     "code": "TUD",
     "coordinator": "prof. dr hab. inż. Krzysztof Kałużyński, dr inż Szymon Cygan",
     "exam": false,
     "prerequisites": "znajomość matematyki i fizyki, podstaw teorii sygnałów i systemów, podstaw elektroniki na poziomie kursu dla studiów inżynierskich kierunku IB, zalecana znajomość środowiska MATLAB",
     "goal": "nabycie podstawowej znajomości nt. wykorzystania techniki ultradźwiękowej w diagnostyce medycznej",
     "content": "Podstawowe pojęcia związane z ruchem falowym. Rodzaje fal. Przemieszczenie i prędkość cząstki. Impedancja akustyczna. Ciśnienie i natężenie fali. Rozwiązania równania falowego. Równanie Eulera. Przekształcenie Fouriera – rola w technice ultradźwiękowej.\nPodstawy obrazowania w ujęciu systemowym.\nPropagacja fali akustycznej w tkankach.\nŹródło elementarne fali kulistej. Całka Kirchhoffa. Przykłady źródeł. Bliska i daleka strefa promieniowania. Kierunkowość źródła. Przekształcenie Fouriera jako narzędzie określania właściwości rozkładu ciśnienia w strefie dalekiej. Przetwornik płaski. Rozkład ciśnienia generowanego przez przetwornik płaski i jego przekrój. Przetwornik liniowy. Układy źródeł elmentarnych i liniowych. Elektroniczne ogniskowanie i odchylanie wiązki przy nadawaniu w strefie dalekiej i w strefie bliskiej. Elektroniczny beamforming przy odbiorze. Podstawowe wiadomości nt. budowy sond do obrazowania.\nPodstawowe metody obrazowania – A, 2D, M i C. Funkcjonalny schemat blokowy ultrasonografu.\nPomiary prędkości przepływu krwi. Zjawisko Dopplera i pomiar metodą fali ciągłej. Podstawowe zależności i schematy blokowe. Pomiar prędkości metodą impulsową. Podstawowe zależności i schematy blokowe. Analiza widmowa sygnałów dopplerowskich prędkości przepływu krwi i podstawowe parametry diagnostyczne. Wstęp do obrazowania rozkładu prędkości przepływu krwi.\nZjawisko piezoeleketryczne. Schemat zastępczy przetwornika. Dopasowanie. Współpraca przetwornika z układami elektronicznymi. Pomiary parametrów przetworników ultradźwiękowych. Przykłady budowy przetworników. Sondy wieloelementowe – typologia i właściwości.\nZjawiska termiczne i mechaniczne związane z ekspozycję na działanie ultradźwięków. Parametry stosowane w ocenie poziomu emisji i skutków ekspozycji. Indeksy cieplny i mechaniczny.\nTendencje rozwojowe. Elastografia. Obrazowanie harmoniczne. Obrazowanie kodowane. Kontrasty ultradźwiękowe. Inne techniki.\nLaboratorium\n1. Analiza sygnałów występujących w diagnostycznej aparaturze ukltradźwiękowej\n2. Obsługa ultrasonografu. Badanie fantomów ultradźwiękowych. Badanie tłumienia w fantomie i w tkankach w funkcji drogi propagacji i częstotliwości.\n3. Badanie właściwości przetworników ultradźwiękowych.\n4. Przepływomierz dopplerowski - pomiary wybranych parametrów. Dopplerowskie pomiary przepływów w naczyniach, analiza widmowa sygnałów, wyznaczanie parametrów diagnostycznych.",
     "assessment": "zaliczenie/kolokwium",
     "literature": "1. Śliwiński A. Ultradźwięki i ich zastosowania, WNT, 2001\n2. Nowicki A. Podstawy ultrasonografii dopplerowskiej, PWN, 1995\n3. Nowicki A. Ultradźwięki w medycynie, Wyd.IPPT, 2010\n4. Łypacewicz G. Piezoelektryczne układy nadawczo-odbiorcze dla celów ultrasonografii, Prace IPPT, 1995\n5. Jensen J.A. Ultrasound imaging and its modeling, w :”Imaging of Complex Media with Acoustic and Seismic Waves”, Springer Verlag, 2000\n6. Jensen J.A. Estimation of blood velocities using ultrasound, Cambridge Univ. Press,1996\n7. Opieliński K. Zastosowanie transmisji fal ultradźwiękowych do charakteryzowania i obrazowania struktury ośrodków biologicznych, Oficyna Wyd. P.Wroc. 2011\n8. Jensen JA, S Ivanov Nikolov, A C H Yu, D Garcia Ultrasound Vector Flow Imaging—Part I: Sequential Systems, IEEE Trans UFFC 2016\n9. Jensen JA, S Ivanov Nikolov, A C H Yu, D Garcia Ultrasound Vector Flow Imaging—Part II: Parallel Systems, IEEE Trans UFFC 2016\n10. Montaldo G et al, Coherent Plane-Wave Compounding for Very High Frame Rate Ultrasonography and Transient Elastography IEEE Trans UFFC 2009\n11. Pedersen MH, T.X.Misaridis, J.A.Jensen, Clinical evaluation of chirp-coded excitation in medical ultrasound, Ultrasound in Medicine & Biology, 29, 6, 2003, 895-905\n12. Wells PN, Liang HD Medical ultrasound: imaging of soft tissue strain and elasticity. Journal of the Royal Society, Interface, Jun 2011, 8(64):1521-1549, DOI: 10.1098/rsif.2011.0054\n13. Cikes M, L Tong, GR Sutherland J D’hooge Ultrafast Cardiac Ultrasound Imaging: Technical Principles, Applications, and Clinical Benefits JACC: Cardiovascular Imaging Volume 7, Issue 8, August 2014, Pages 812-823 https://doi.org/10.1016/j.jcmg.2014.06.004"
    },
    {
     "name": "Techniki laserowe w biomedycynie – biofotonika",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 2,
     "hours": {
      "W": 30
     },
     "syllabusId": 900296,
     "code": "TLBiO",
     "coordinator": "Wojciech Krauze, Adam Styk, Piotr Zdańkowski",
     "exam": false,
     "prerequisites": "Zaliczony kurs fizyki.",
     "goal": "Poznanie właściwości promieniowania lasera, jego oddziaływania na tkankę, nisko i wysokoenergetycznych metod terapii laserowej oraz optycznych metod obrazowania w diagnostyce biomedycznej z zastosowaniem propagacji światła w ośrodkach rozpraszających (metody sortowania fotonów, optoakustyka, optyczna tomografia koherencyjna).",
     "content": "Treść wykładu\n1. Podstawy techniki laserowej. (3h)\n\nPromieniowanie świetlne w medycynie - rys historyczny.\nNajważniejsze parametry charakteryzujące promieniowanie optyczne.\nPodstawy fizyczne działania lasera. Podstawowe klasyfikacje laserów.\nPrzykładowe zastosowania w medycynie (w szczególności laserów\npółprzewodnikowych).\n\n2. Oddziaływanie promieniowania z tkanką (2h)\n\nGłębokość wnikania i absorpcja promieniowania dla wybranych\ntkanek w funkcji długości fali promieniowania. Mechanizmy oddziaływania\npromieniowania na tkankę (fotochemiczne, fototermiczne, fotojonizacyjne\ni elektromechaniczne). Dawkowanie promieniowania.\nAparatura.\n\n3. Wybrane zagadnienia terapii laserowej (3h)\n\nJednostki chorobowe do napromienienia laserem małej mocy.\nLeczenie laserami energetycznymi (w tym metoda PDT, gastroenterologia,\nrekanalizacja naczyń krwionośnych, okulistyka, choroby układu krążenia\n- angioplastyka, mioplastyka).\n\n4. Nowe optyczne metody obrazowania w medycynie (2h)\n\nPropagacja światła w ośrodku rozpraszającym. Metody sortowania\n(bramkowania) fotonów. Metoda LTPS (w świetle przechodzącym ze\nskanowaniem konfokalnym) i obrazowania z zastosowaniem bramki\nKerra.\n\n5. Opto(termo)akustyka (2h)\n\nPrzetwarzanie światła na ultradźwięki. Laserowe obrazowanie\noptoakustyczne. Zastosowania - badania z fantomami oraz badania\npatologiczne in vivo. Diagnozowanie nowotworów.\n\n6. Optyczna tomografia koherencyjna (14h)\n\nDetekcja ech optycznych z zastosowaniem zjawiska interferencji,\nimplementacja w dziedzinie czasu i częstotliwości. Zastosowania w\ntkankach słabo rozpraszających: wysokorozdzielcze badania siatkówki i\nwarstw podsiatkówkowych (diagnostyka retynopatii cukrzycowej,\njaskry, torbielowego obrzęku plamki, starczego zwyrodnienia plamki);\noptymalizacja obrazowania z zastosowaniem optyki adaptacyjnej, różnych\ndługości fali, światła spolaryzowanego (do wizualizacji struktur\nanizotropowych siatkówki i segmentacji siatkówkowego nabłonka\nbarwnikowego), kompensacji dyspersji i aberracji soczewki ocznej;\nsystemy ultraszybkiego obrazowania. Zastosowania w tkankach silnie\nrozpraszających: diagnozowanie układu żołądkowo-jelitowego, nowotworu\npęcherza moczowego, miażdżycy tętnic wieńcowych, stanów zapalnych\njajowodu, chrząstki z zapaleniem kostnostawowym, badania rozwoju\nmorfologii embrionalnej, śródoperacyjny monitoring zabiegów\nmikrochirurgicznych, trójwymiarowe polaryzacyjne obrazowanie skóry\nludzkiej oraz termicznie uszkodzonych tkanek. Polowa mikroskopia\nkoherencyjna (obrazowanie z wyznaczaniem modulacji interferogramu\ndwuwiązkowego, systemy z zastosowaniem mikroskopu Linnika w paśmie\ndługości fali promieniowania 800-1200 nm).",
     "assessment": "2 x kolokwium",
     "literature": "Hamblin, Huang “Handbook of photomedicine”, CRC Press, 2020\n\nTurchin, “Light and Laser Therapy: Clinical Procedures”, 2019\n\nJóźwicki „Technika laserowa i jej zastosowania”, OWPW, 2009"
    },
    {
     "name": "Techniki medycyny nuklearnej (IBM)",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 2,
     "syllabusId": 900292,
     "code": "OB",
     "exam": true
    },
    {
     "name": "Wprowadzenie do programowania w MATLABie",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 3,
     "hours": {
      "W": 15,
      "L": 15
     },
     "syllabusId": 900302,
     "code": "MATLA",
     "coordinator": "dr inż. Beata LEŚNIAK-PLEWIŃSKA",
     "exam": false,
     "prerequisites": "Wymagania wstępne: podstawowa znajomość obsługi komputera klasy PC oraz systemu operacyjnego Windows, znajomość matematyki w zakresie studiów inżynierskich na kierunku Inżynieria Biomedyczna (w szczególności rachunku macierzowego). W rozwiązywaniu zadań laboratoryjnych przydatna może być znajomość podstaw różnych dziedzin, np. propedeutyki medycyny, grafiki komputerowej, elektroniki i elektrotechniki, przetwarzania sygnałów.\nZalecane przedmioty poprzedzające: Algebra liniowa i analiza 1, Podstawy programowania.",
     "goal": "Celem przedmiotu jest przekazanie wiedzy i umiejętności niezbędnych do wykorzystywania środowiska MATLAB w rozwiązywaniu problemów obliczeniowych spotykanych w praktyce inżynierskiej ze szczególnym uwzględnieniem potrzeb studentów kierunku Inżynieria Biomedyczna.",
     "content": "Zakres wykładu:\n(1) Praca w oknie poleceń: wprowadzanie danych, typy/klasy danych, zarządzanie przestrzenią roboczą, system pomocy. słowa kluczowe. Zapis i odczyt danych - MAT-pliki, DAT-pliki.\n(2) Tworzenie i praca z M-plikiem: skrypty i funkcje. Edycja, analiza i optymalizacja kodu (Editor, Debuger, Profiler).\n(3) Macierze i podstawowe operacje na macierzach: tworzenie i modyfikacja macierzy, indeksowanie elementów macierzy.\n(4) Struktury danych. Tablice wielowymiarowe: tablice komórkowe i strukturalne, metody ich tworzenia oraz sposób organizacji i dostępu do danych.\n(5) Łańcuchy znakowe: reprezentacja i podstawowe operacje na łańcuchach znakowych.\n(6) Operatory arytmetyczne, logiczne, relacji i inne. Priorytet operatorów.\n(7) Instrukcje sterujące (for, while, continue i break) i warunkowe (if, if else i switch).\n(8) Funkcje obsługi wejścia/wyjścia.\n(9) Efektywność obliczeń: zarządzanie pamięcią i wektoryzacja. Funkcje: timeit i tic/toc.\n(10) Grafika w MATLAB-ie: podstawowe polecenia. Obiektowy system graficzny - modyfikacja właściwości obiektów graficznych. Predefiniowane okienka dialogowe.\n\nZakres laboratorium:\n(1) Praca w oknie poleceń. Proste i złożone typy danych: tablice, łańcuchy znakowe, struktury danych.\n(2) M-pliki (skrypty i funkcje)\n(3) Wyrażenia logiczne. Instrukcje warunkowe.\n(4) Operacje wejścia/wyjścia. Instrukcje sterujące.\n(5) Kontrola błędów.\n(6) Efektywność obliczeń.\n(7) Graficzny interfejs użytkownika (GUI). Budowa GUI przy użyciu narzędzia App Designer. Analiza przykładowej aplikacji. Programowanie wywołań zwrotnych dla poszczególnych komponentów.",
     "assessment": "Kolokwium oraz ocena bieżąca zadań realizowanych w trakcie zajęć laboratoryjnych (sprawdzanie wiedzy oraz praktycznych umiejętności związanych z pracą w programie)",
     "literature": "Książki dostępne w bibliotekach PW\n(1) Bogumiła Mrozek, Zbigniew Mrozek MATLAB. Leksykon kieszonkowy. Helion, 2006\n(2) Bogumiła Mrozek, Zbigniew Mrozek: MATLAB i Simulink : poradnik użytkownika, Helion, 2018\n(3) Rudra Pratap: Matlab dla naukowców i inżynierów, PWN, 2015\n(4) Gdeisat Munther, Lilley Francis: Matlab by Example: Programming Basics, Elsevier Science Technology, 2013\n(5) Stormy Attaway: Matlab: a practical introduction to programming and problem solving, Butterworth Heinemann, 2019\n\nStrony internetowe\n(1) www.mathworks.com (strona producenta MATLAB'a i Simulink'a )\n(2) www.ont.com.pl (strona autoryzowanego dystrybutora produktów firmy The MathWorks)"
    },
    {
     "name": "Elektroniczna aparatura medyczna I",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 6,
     "hours": {
      "W": 45,
      "L": 30
     },
     "syllabusId": 900269,
     "code": "EAMEB",
     "coordinator": "Prof. dr hab. inż. Tadeusz PAŁKO, Prof. dr hab. inż. Krzysztof Kałużyński",
     "exam": true,
     "prerequisites": "Znajomość układów elektronicznych, elektrotechniki, metod pomiaru wielkości elektrycznych i nieelektrycznych, anatomii i fizjologii (kurs dla kierunku IB)",
     "goal": "Znajomość elektronicznych urządzeń medycznych do diagnostyki, nadzoru, terapii i wspomagania narządów.",
     "content": "Sygnały biologiczne, ich pochodzenie i właściwości. Metody i urządzenia do pomiaru i rejestracji. Elektrody do odbioru sygnałów bioelektrycznych. Przetworniki (sensory) sygnałów biologicznych. Wzmacniacze sygnałów bioelektrycznych. Wzmacniacze specjalne. Metody eliminacji zakłóceń. Omówienie torów sygnałowych wybranych urządzeń elektrograficznych Urządzenia do inwazyjnych i nieinwazyjnych pomiarów ciśnienia. Przepływomierze ultradźwiękowe, elektromagnetyczne, NMR. Mierniki oparte na metodach Ficka, rozcieńczenia wskaźnika i inne. Metoda impedancyjna. Spirometry. Mierniki prężności O2, mierniki saturacji tlenowej, pulsoksymetry, kapnometry. Audiometry. Protezowanie słuchu. Aparaty do pomiaru ostrości wzroku, ciśnienia śródgałkowego i pola widzenia. Urządzenia do elektrografii ENG, ERG i badań potencjałów wywołanych. Urządzenia do badań impedancyjnych, kardiotokograf i inne. Telemetria EKG. Nadzór telemetryczny wielu sygnałów. Inne urządzenia dla telemedycyny. Kardiowertery serca, stymulatory mięśni i nerwów, kardiostymulatory, defibrylatory. Aparatura diagnostyczna, terapeutyczna, chirurgiczna. Diatermia krótko-, mikrofalowa oraz ultradźwiękowa. Urządzenia kriogeniczne. Respiratory, natleniacze, dializatory. Pompy z cewnikiem balonowym wewnątrzaortalnym. Urządzenia do hipo- i hipertermii. Litotrypter. Budowa zasilaczy, bariery izolacyjne. Normy bezpieczeństwa. Kompatybilność elektromagnetyczna urządzeń medycznych. Podstawowe funkcje ośrodka intensywnej opieki medycznej (OIOM). Wymagania stawiane OIOM pod względem aparatury. Monitorowanie przyłóżkowe i centralne. Monitory EKG, kardiotachometry, arytmio-komputery. Monitory: ciśnienia krwi, oddechu, temperatury, objętości skurczowej i minutowej serca, saturacji tlenowej, pH i pCO2 krwi oraz zawartości O2 i CO2 w gazach oddechowych. Systemy nadzoru szpitalnego ogólnego i systemy specjalistyczne: kardiologiczny, neurologiczny, okołoporodowy, śródoperacyjny i pooperacyjny. W ramach laboratorium prowadzonych jest 10 ćwiczeń po 3 godziny, w ramach których studenci prowadzić będą pomiary wybranych układów elektronicznych stosowanych w aparaturze biomedycznej oraz pomiary podstawowych parametrów torów sygnałowych wybranych aparatów (np. elektrokardiograf, reometr, stymulator, przepływomierz dopplerowski, pulsooksymetr, kapnograf, respirator)",
     "assessment": "wykład – egzamin,\nlaboratorium - zaliczenie na podstawie sprawdzianów i sprawozdań",
     "literature": "1. Augustyniak P. Elektroniczna aparatura medyczna (eBook), 2015, Wydawnictwa AGH\n2. R.S. Khandpur Handbook of Biomedical Instrumentation, wyd.3, Mc Graw-Hill education (India) Private Ltd. 2014\n3. Webster J. G. Medical instrumentation -application and design. wyd.4, John Wiley and Sons.Inc. New York 2010,\n4. Myer Kutz Biomedical Engineering and design handbook, wyd. 2, McGraw Hill 2009\n5. Biocybernetyka i Inżynieria Biomedyczna 2000 (red. M. Nałęcz) t. 2 Biopomiary. AOW EXIT Warszawa 2001\n6. Biocybernetyka i Inżynieria Biomedyczna 2000 (red. M. Nałęcz), Sztuczne narządy t. 3, AOW EXIT, Warszawa 2005.\n7. Biocybernetyka i Inżynieria Biomedyczna 2000 (red. M. Nałęcz), Biosystemy t. 1, AOW EXIT, Warszawa 2005.\n8. Pęczalski K. Wybrane metody diagnostyczne wykorzystywane w elektroterapii serca, 2010, AOW EXIT.\n9. Maniewski R., Liebert A. Metoda laserowo-dopplerowska w badaniach mikrokrążenia krwi, AOW EXIT 2003\n10. J.Carr, J.M. Brown Introduction to Biomedical Equipment Technology, wyd. 4, Prentice-Hall, 2001\n11. Loizou P.C. Speech processing in vocoder-centric cochlear implants, Adv Otorhinolaryngol. Basel, Karger, 2006, vol 64, 109–143\n12. Zajt T. Metody woltamperometryczne i elektrochemiczna spektroskopia impedancyjna, 2001, W. Gdańskie\n13. Nowakowski A., Kaczmarek M., Rumiński J., Hryciuk M., Postępy Termografii, 2001, W. Gdańskie"
    },
    {
     "name": "Laboratorium Automatyki i Robotyki",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 2,
     "hours": {
      "L": 15
     },
     "syllabusId": 900271,
     "code": "LAUR",
     "coordinator": "Dr inż. Alicja Siewnicka",
     "exam": false,
     "prerequisites": "Wiedza z zakresu przedmiotów Podstawy automatyki i Podstawy robotyki",
     "goal": "Nabycie umiejętności praktycznego wykorzystania wiedzy teoretycznej zdobytej w ramach przedmiotów Podstawy automatyki i Podstawy robotyki.",
     "content": "Identyfikacja własności statycznych i dynamicznych obiektu regulacji poziomu lub temperatury.\nBadanie jednoobwodowego układu regulacji poziomu lub temperatury: dobór nastaw, rozruch układu, badanie przebiegów przejściowych, ocena wskaźników jakości regulacji.\nProjektowanie, wykonywanie schematów i budowa układów kombinacyjnych z elementów logicznych oraz stykowo-przekaźnikowych.\nProjektowanie i budowa typowych pneumotronicznych układów sekwencyjnych o założonych cechach funkcjonalnych; poznanie sprzętu do tworzenia takich układów.\nPoznanie budowy mechanizmu kinematycznego robota przemysłowego oraz jego układów: napędowego, przeniesienia ruchu, sterowania, sensorycznego i zasilającego. Uruchomienie, ręczne sterowanie mechanizmem kinematycznym, programowanie elementarnych zadań robota przez nauczanie. Projektowanie trajektorii ruchu i operacji towarzyszących na przykładzie wybranego robota wyposażonego w narzędzie.",
     "assessment": "Ocena na podstawie sprawdzianu wiedzy z zakresu poszczególnych ćwiczeń, bieżącej pracy studentów na zajęciach oraz sprawozdań z ćwiczeń laboratoryjnych.",
     "literature": "1. D. Holejko, W.J. Kościelny, Automatyka procesów ciągłych, Wydawnictwo Politechnika Warszawska, 2012.\n2. Kościelny W., Podstawy automatyki, część II. Wydawnictwa Politechniki Warszawskiej, 1984.\n3. Żelazny M., Podstawy Automatyki, WNT, Warszawa 1976\n4. Mariusz Olszewski, Podstawy mechatroniki, Rea, Warszawa 2006.\n5. Gabriel Kost, Piotr Łebkowski, Łukasz N. Węsierski, Automatyzacja i robotyzacja procesów produkcyjnych, PWE, 2013.\n6. Ryszard Zdanowicz, Robotyzacja dyskretnych procesów produkcyjnych, Wydawnictwo Politechniki Śląskiej, 2013."
    }
   ]
  },
  {
   "number": 6,
   "courses": [
    {
     "name": "Przedmioty obieralne sem. 6",
     "block": "Obieralne specjalności",
     "group": "Obieralne",
     "ects": 14,
     "syllabusId": 900283,
     "exam": true
    },
    {
     "name": "Cyfrowe przetwarzanie obrazów",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "hours": {
      "W": 30,
      "L": 15
     },
     "syllabusId": 900274,
     "code": "CPOB",
     "coordinator": "dr inż. Beata Leśniak-Plewińska",
     "exam": false,
     "prerequisites": "Znajomość podstaw teorii systemów i sygnałów, przekształceń całkowych i matematyki w zakresie studiów na kierunku Inżynieria Biomedyczna. Na zajęciach laboratoryjnych przydatna będzie umiejętność posługiwania się środowiskiem MATLAB.",
     "goal": "Celem przedmiotu jest przedstawienie podstawowych pojęć, metod i algorytmów dla cyfrowego przetwarzania obrazów oraz ich praktyczne zastosowanie z użyciem narzędzia programowego (środowiska MATLAB).",
     "content": "Podstawowe pojęcia w przetwarzaniu obrazów. Powstawanie obrazu w ujęciu systemowym. Związki między właściwościami obiektu a parametrami obrazu.\nObrazy kolorowe i monochromatyczne. Rozdzielczość. Częstotliwość przestrzenna. Jednorodność różniczkowa i całkowa.\nPróbkowanie obrazu. Interpolacja dwuliniowa.\nPrzetwarzanie obrazu w dziedzinie próbek przestrzeni i w dziedzinie częstotliwości. Filtracje i transformacje 2D.\nArytmetyka i algebra obrazów. Operacje morfologiczne.\nKompresja stratna i bezstratna.\nTworzenia histogramu. Analiza histogramu. Zastosowanie w segmentacji. Wyrównywanie histogramu.\nPrzekształcenia afiniczne. Transformaty macierzowe.\nFormaty graficzne (JPEG, GIF, TIFF). DICOM.\nZastosowania w inżynierii biomedycznej.",
     "assessment": "Wykład - sprawdzian końcowy (50%).\nLaboratorium - ocena protokołów i sprawdziany po każdym ćwiczeniu (50%).",
     "literature": "1) W.Malina, M.Smiatacz: Cyfrowe przetwarzanie obrazów. Exit, Warszawa 2005\n2) W.Malina, M.Smiatacz: Metody cyfrowego przetwarzania obrazów. Exit, Warszawa 2005\n3) Z. Wróbel, R. Koprowski Praktyka przetwarzania obrazów z zadaniami w programie MATLAB Exit, Warszawa 2013\n4) R.Tadeusiewicz, P.Korohoda: Komputerowa analiza i przetwarzanie obrazów. Wydawnictwo Fundacji Postępu Telekomunikacji, Kraków 1997\n5) W. Burger, M.J. Burge: Principles of Digital Image Processing. Fundamental techniques. Springer-Verlag, Londyn 2009\n6) W. Burger, M.J. Burge: Principles of Digital Image Processing. Core algorithms. Springer-Verlag, Londyn 2009\n7) W. Burger, M.J. Burge Principles of Digital Image Processing. Advanced methods Springer, Londyn 2013\n8) Ch. Solomon, T. Breckon Fundamentals of Digital Image Processing: A Practical Approach with Examples in Matlab Wiley, 2010\n9) O. Marques Practical Image and Video Processing Using MATLAB Wiley-IEEE Press, 2011\n10) R.C Gonzalez, R.E. Woods: Digital image processing. Pearson, 2018\n11) R.C Gonzalez, R.E. Woods: Digital image processing using Matlab. Prentice Hall, 2020"
    },
    {
     "name": "Pracownia problemowa",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 3,
     "hours": {
      "P": 45
     },
     "syllabusId": 900277,
     "code": "PRP",
     "coordinator": "dr hab. inż. Jakub Żmigrodzki",
     "exam": false,
     "prerequisites": "Znajomość materiału kursu matematyki, fizyki, elektroniki, elektronicznej aparatury medycznej dla kierunku Inżynieria Biomedyczna",
     "goal": "Zdobycie wiedzy i umiejetności w zakresie projektowania prostej aparatury elektromedycznej bądź jej podsystemów oraz w zakresie posługiwania sie komputerowymi technikami symulacji i projektowania układów elektroniki medycznej.",
     "content": "Studenci wykonują projekt realizując proste urządzenie elektromedyczne lub jego podsystem, np. wzmacniacz ciśnienia współpracujący z określonym przetwornikiem, wzmacniacz EEG, kardiotachometr, wielokanałowy wzmacniacz do fonokardiografii, wzmacniacz do wspomagania słuchu, układy współpracujące z ciśnieniomierzem oscylometrycznym i inne.",
     "assessment": "Praca studentów podlega bieżącej kontroli prowadzących zajęcia. Zajęcia projektowe są podzielone etapy, które są oceniane zgodnie na podstawie pisemnych sprawozdań.",
     "literature": "[1]J. C. Whitaker, The electronics handbook, 2. wyd. Boca Raton, Fla.; London: CRC, 2004.\n[2]W.-K. Chen, The circuits and filters handbook, 2. ed. Boca Raton Fla.: CRC Press, 2002.\n[3]J. Rydzewski, Pomiary oscyloskopowe, 3. wyd. Warszawa: WNT, 2007.\n[4]R. Mancini, Op amps for everyone. Texas Instruments, 2002.\n[5]P. Horowitz i W. Hill, Sztuka elektroniki, 7. wyd., t. 2, 2 t. Warszawa: Wydawnictwa Komunikacji i Łączności, 2003.\n[6]P. Horowitz i W. Hill, Sztuka elektroniki, 7. wyd., t. 1, 2 t. Warszawa: Wydawnictwa Komunikacji i Łączności, 2003.\n[7]P. Augustyniak, Elektroniczna Aparatura Medyczna, 1. wyd. Wydawnictwa AGH, 2015."
    },
    {
     "name": "Praktyka przeddyplomowa",
     "block": "Podstawowe",
     "group": "Obowiązkowe",
     "ects": 4,
     "syllabusId": 900245,
     "coordinator": "Opiekun praktyki w ramach instytutu lub specjalności",
     "exam": false,
     "goal": "Zastosowanie w praktyce wiedzy, umiejętności i kompetencji społecznych zdobytych w trakcie studiów.\nZdobycie nowej wiedzy i umiejętności praktycznych.\nRozpoznanie potrzeb i wymagań pracodawców dotyczących nowych pracowników.\nPoznanie systemu organizacji przedsiębiorstwa oraz uwarunkowań i reguł obowiązujących w środowisku pracy.\nKształtowanie właściwego stosunku do pracy: dbanie o jakość pracy, terminowość wykonywania zadań, prawidłowa współpraca z innymi osobami i działami w przedsiębiorstwie, rozwój własnej inicjatywy w środkowisku pracy, nabycie umiejętności pracy w zespole.",
     "content": "Szczegółowe treści zależą od miejsca wykonywania praktyki",
     "assessment": "Ocena sprawozdania z wykonania praktyki i potwierdzenia z miejsca realizacji praktyki. Wynik oceny: zaliczona/niezaliczona"
    }
   ]
  },
  {
   "number": 7,
   "courses": [
    {
     "name": "Praca dyplomowa",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 15,
     "syllabusId": 900257,
     "code": "PD",
     "coordinator": "opiekun pracy dyplomowej",
     "exam": false,
     "prerequisites": "Rejestracja na VII semestr studiów, wybór tematu pracy dyplomowej",
     "goal": "Wykazanie biegłości w zakresie posługiwania się wiedzą, umiejętnościami i kompetencjami społecznymi, nabytymi w trakcie realizacji studiów i właściwymi dla wybranej specjalności.",
     "content": "Treści merytoryczne wynikają z charakteru wykonywanej pracy i uzgadniane są opiekunem pracy.Praca dyplomowa inżynierska stanowi samodzielne rozwiązanie przez studenta problemu technicznego o charakterze inżynierskim oraz wykazuje uzyskanie przez niego wiedzy inżynierskiej w zakresie specjalności kształcenia.",
     "assessment": "Opinia o pracy wydana przez opiekuna oraz recenzja opracowana przez powołanego recenzenta.",
     "literature": "Literatura proponowana przez opiekuna pracy dyplomowej"
    },
    {
     "name": "Seminarium dyplomowe",
     "block": "Kierunkowe",
     "group": "Obowiązkowe",
     "ects": 3,
     "hours": {
      "C": 30
     },
     "syllabusId": 900278,
     "code": "SD",
     "coordinator": "dr hab. inż. Piotr Tulik",
     "exam": false,
     "prerequisites": "wybrany temat oraz promotor pracy dyplomowej inżynierskiej",
     "goal": "Uzupełnienie wiedzy na temat zasad dokumentacji projektu inżynierskiego i zasad ochrony własności intelektualnej. Praktyczne sprawdzenie umiejętności prezentacji założeń i wyników pracy.",
     "content": "Zakres seminarium obejmuje:\nPodstawy prawne procesu dyplomowania.\nElementy składowe pracy dyplomowej inżynierskiej.\nEdycja pracy dyplomowej.\nZasady wykorzystania w pracy źródeł literaturowych.\nPodstawowe informacje z zakresu ochrony własności intelektualnej. Prezentacja założeń pracy dyplomowej oraz wybranego etapu realizacji pracy.\nDyskusje nad prezentacjami innych Studentów.",
     "assessment": "seminarium – ocena wygłoszonych prezentacji i opracowania pisemnego oraz umiejętność dyskutowania;",
     "literature": "Ustawa z dnia 20 lipca 2018 r. - Prawo o szkolnictwie wyższym i nauce. Dz.U. 2018 poz. 1668.\nRegulamin studiów w Politechnice Warszawskiej. Załacznik do uchwały nr 363/XLIX/2019 Senatu PW z późniejszymi zmianami.\nZarządzenie nr 43/2016 Rektora PW z dnia 8/09/2016 w sprawie ujednolicenia wymogów edytorskich prac dyplomowych\n\nLiteratura dotycząca realizacji danego tematu pracy dyplomowej zalecana przez promotora."
    }
   ]
  }
 ]
}
