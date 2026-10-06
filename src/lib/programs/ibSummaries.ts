// Zredagowane opisy przedmiotów Inżynierii Biomedycznej - krótko i po ludzku, na podstawie sylabusów
// z Katalogu ECTS PW (2021/22). Pełna treść jest pod linkiem "Pełny sylabus".
// Klucz: nazwa przedmiotu w programie (src/lib/programs/ib.ts).
import type { CourseSummary } from '../studyProgram'

export const SUMMARIES: Record<string, CourseSummary> = {
  // Semestr 1
  'Anatomia i fizjologia': {
    about: 'Podstawy budowy i działania ludzkiego ciała - od komórek po układy narządów.',
    topics: [
      'Budowa ciała',
      'Komórki i tkanki, transport jonów',
      'Układy: kostny, mięśniowy, oddechowy, pokarmowy, moczowy',
      'Układ nerwowy',
      'Serce, krążenie i krew',
      'Elementy histologii i embriologii',
    ],
  },
  Metrologia: {
    about: 'Jak mierzyć sygnały elektryczne i biomedyczne oraz oceniać błędy pomiarów - w praktyce z multimetrem i oscyloskopem.',
    topics: [
      'Pojęcia metrologiczne i przyrządy pomiarowe',
      'Sygnały i obwody elektryczne',
      'Błędy pomiarowe',
      'Pomiary napięć, częstotliwości i czasu',
      'Pomiary rezystora, kondensatora i cewki',
      'Rejestracja sygnałów biomedycznych',
    ],
    needs: 'jeden semestr analizy matematycznej',
  },
  'Propedeutyka medycyny': {
    about: 'Medycyna dla inżyniera: diagnostyka, leczenie, higiena i przepisy wokół urządzeń medycznych. Na ćwiczeniach każdy prezentuje wybrany dział medycyny.',
    topics: [
      'Zdrowie, choroba, organizacja służby zdrowia',
      'Etyka w medycynie',
      'Higiena, dezynfekcja i sterylizacja',
      'Diagnostyka i metody leczenia',
      'Medycyna oparta na dowodach',
      'Przepisy i normy dla urządzeń medycznych',
    ],
  },
  'Podstawy programowania': {
    about: 'Działanie komputera i obsługa narzędzi biurowych na poziomie certyfikatu ECDL.',
    topics: [
      'Budowa i działanie komputera',
      'Systemy operacyjne i oprogramowanie',
      'Sieci komputerowe',
      'Bezpieczeństwo danych, prawo autorskie',
      'Laboratorium: edytor tekstu, arkusz, bazy danych, prezentacje',
    ],
  },
  'Fizyka 1': {
    about: 'Mechanika, elektrodynamika i optyka na poziomie uczelni technicznej.',
    topics: [
      'Zasady dynamiki i zasady zachowania',
      'Drgania i fale, efekt Dopplera',
      'Pole elektryczne i magnetyczne',
      'Równania Maxwella',
      'Interferencja, dyfrakcja, polaryzacja',
      'Holografia, mikroskop elektronowy',
    ],
    needs: 'algebra liniowa i analiza',
  },
  'Matematyka - Algebra liniowa': {
    about: 'Liczby zespolone, macierze i układy równań. Katalog podaje tu przez pomyłkę ten sam opis co przy Analizie I.',
    topics: ['Liczby zespolone', 'Macierze i wyznaczniki', 'Macierz odwrotna, rząd macierzy', 'Układy równań liniowych'],
    needs: 'matematyka ze szkoły średniej',
  },
  'Matematyka - Analiza I': {
    about: 'Rachunek różniczkowy i całkowy funkcji jednej zmiennej oraz wstęp do funkcji wielu zmiennych i równań różniczkowych.',
    topics: [
      'Granice i ciągłość',
      'Pochodne i ich zastosowania, wzór Taylora',
      'Całki nieoznaczone i oznaczone',
      'Całki niewłaściwe',
      'Funkcje wielu zmiennych, ekstrema',
      'Równania różniczkowe I i II rzędu',
    ],
    needs: 'matematyka ze szkoły średniej',
  },
  Materiałoznawstwo: {
    about: 'Budowa i właściwości materiałów oraz ich dobór do zastosowań medycznych.',
    topics: [
      'Podstawy krystalografii',
      'Struktura a właściwości materiałów',
      'Metale, ceramika, polimery, kompozyty',
      'Technologie wytwarzania i łączenia',
      'Implanty i sztuczne narządy',
    ],
  },
  'Szkolenie BHP': {
    about: 'Zasady bezpieczeństwa na zajęciach i pierwsza pomoc.',
  },

  // Semestr 2
  Biomateriały: {
    about: 'Materiały stosowane w medycynie i to, jak dobrać je do implantu albo narzędzia.',
    topics: [
      'Biomateriały metaliczne, ceramiczne, polimerowe, kompozytowe',
      'Sterylizacja',
      'Badania in vitro i in vivo',
      'Inżynieria powierzchni i biozgodność',
      'Implanty i instrumentarium medyczne',
    ],
    needs: 'matematyka, fizyka',
  },
  'Fizykomedyczne podstawy inżynierii biomedycznej': {
    about: 'Fizyka procesów zachodzących w organizmie - podstawa do projektowania aparatury medycznej.',
    topics: [
      'Transport jonów przez błony',
      'Reakcje enzymatyczne',
      'Sygnały elektryczne w tkankach',
      'Układ nerwowy i EEG',
      'Układ krwionośny i EKG',
      'Elektryczne właściwości tkanek, elektrostymulacja',
      'Biofizyka zmysłów',
    ],
    needs: 'matematyka i fizyka',
  },
  'Programowanie obiektowe': {
    about: 'Programowanie w C, a potem obiektowo w C++. Na wykładzie dwa sprawdziany po 20 pkt, na laboratorium programy z interfejsem graficznym.',
    topics: [
      'Typy, operatory i instrukcje w C',
      'Funkcje, tablice, wskaźniki, pamięć dynamiczna',
      'Pliki i preprocesor',
      'Klasy, konstruktory, dziedziczenie',
      'Przeciążanie, wyjątki, szablony, STL',
      'Graficzny interfejs użytkownika',
    ],
  },
  'Fizyka 2': {
    about: 'Mechanika kwantowa i fizyka statystyczna.',
    topics: [
      'Dualizm korpuskularno-falowy',
      'Równanie Schrödingera, efekt tunelowy',
      'Atom i jądro atomowe',
      'Ciało stałe, magnetyzm, nanotechnologia',
      'Entropia i temperatura',
      'Statystyki kwantowe, laser',
    ],
    needs: 'Fizyka 1, Analiza I',
  },
  'Matematyka - Analiza 2': {
    about: "Szeregi, całki wielokrotne, funkcje zespolone oraz przekształcenia Fouriera i Laplace'a.",
    topics: [
      'Szeregi liczbowe i potęgowe, szereg Taylora',
      'Szeregi Fouriera',
      'Całki podwójne i potrójne',
      'Całki krzywoliniowe, twierdzenie Greena',
      'Funkcje zmiennej zespolonej',
      'Transformata Fouriera',
      "Transformata Laplace'a",
    ],
    needs: 'Analiza I, algebra liniowa',
  },
  'Mechanika i Wytrzymałość materiałów': {
    about: 'Statyka i wytrzymałość materiałów: jak liczyć siły i naprężenia w elementach konstrukcji.',
    topics: [
      'Zasady statyki, układy sił',
      'Tarcie',
      'Rozciąganie, ścinanie, skręcanie, zginanie',
      'Momenty bezwładności',
      'Wyboczenie prętów',
      "Stan naprężenia i odkształcenia, prawo Hooke'a",
      'Tarcze, płyty i powłoki',
      'Pełzanie i relaksacja',
    ],
    needs: 'matematyka i fizyka z 1. roku',
  },
  'Wstęp do elektrotechniki': {
    about: 'Analiza obwodów elektrycznych prądu stałego i zmiennego oraz podstawy maszyn elektrycznych.',
    topics: [
      'Prawa Kirchhoffa, metoda węzłowa',
      'Twierdzenia Thevenina i Nortona',
      'Obwody prądu sinusoidalnego, rezonans',
      'Szeregi Fouriera w obwodach',
      'Obwody nieliniowe, prostowniki',
      'Stany nieustalone',
      'Prąd trójfazowy, silniki',
    ],
    needs: 'algebra liniowa i analiza',
  },

  // Semestr 3
  'Grafika komputerowa': {
    about: 'Algorytmy grafiki 2D i 3D oraz wizualizacja w medycynie, np. w tomografii i wirtualnej endoskopii.',
    topics: [
      'Obraz cyfrowy i modele barw',
      'Grafika rastrowa i wektorowa, algorytm Bresenhama',
      'Przekształcenia 2D i 3D',
      'Krzywe i powierzchnie (Bézier, funkcje sklejane)',
      'Rzutowanie, widoczność, oświetlenie',
      'Śledzenie promieni, tekstury',
      'Laboratorium: przetwarzanie obrazów, sceny 3D',
    ],
    needs: 'algorytmika i struktury danych',
  },
  'Laboratorium elektrotechniki': {
    about: 'Pomiary prostych obwodów w praktyce - to, co było na Wstępie do elektrotechniki.',
    topics: [
      'Prawa Ohma i Kirchhoffa',
      'Źródła zastępcze, superpozycja',
      'Obwody sinusoidalne, rezonans',
      'Wzmacniacze operacyjne',
      'Obwody nieliniowe, prostowniki',
      'Filtry, stany nieustalone',
    ],
    needs: 'Wstęp do elektrotechniki',
  },
  'Podstawy Automatyki': {
    about: 'Regulacja procesów ciągłych (regulatory PID, stabilność) i projektowanie układów logicznych.',
    topics: [
      'Człony dynamiczne, transmitancja',
      'Charakterystyki częstotliwościowe',
      'Schematy blokowe',
      'Stabilność i jakość regulacji',
      'Regulatory PID i dobór nastaw',
      "Algebra Boole'a, minimalizacja funkcji",
      'Układy kombinacyjne i sekwencyjne',
    ],
    needs: "równania różniczkowe, przekształcenie Laplace'a, algebra Boole'a",
  },
  'Podstawy elementów i układów elektronicznych': {
    about: 'Jak działają diody i tranzystory oraz jak projektuje się układy analogowe - od wzmacniaczy po zasilacze.',
    topics: [
      'Półprzewodniki i złącze p-n',
      'Tranzystory MOS i bipolarne',
      'Wzmacniacze operacyjne, sprzężenie zwrotne',
      'Filtry, generatory, pętla PLL',
      'Przetworniki A/C i C/A, próbkowanie',
      'Zasilacze',
      'Symulacja układów (SPICE)',
    ],
  },
  Radiologia: {
    about: 'Promieniowanie X i γ w diagnostyce: aparat RTG, tomografia i ochrona radiologiczna.',
    topics: [
      'Fizyczne podstawy radiologii',
      'Oddziaływanie promieniowania z materią',
      'Lampa i aparat RTG',
      'Obraz rentgenowski, tomografia komputerowa',
      'Diagnostyka izotopowa',
      'Dozymetria i ochrona radiologiczna',
      'Detektory promieniowania',
    ],
    needs: 'fizyka atomowa',
  },
  'Wspomagane komputerowo projektowanie inżynierskie': {
    about: 'Rysunek techniczny i projektowanie w CAD, analiza metodą elementów skończonych i programowanie maszyn CNC.',
    topics: [
      'Zapis konstrukcji, wymiary i tolerancje',
      'Rysunki złożeniowe',
      'Metoda elementów skończonych i brzegowych',
      'Optymalizacja numeryczna',
      'Systemy CAD/CAM',
      'Laboratorium: bryły i złożenia w CAD',
      'Projekt: program dla maszyny CNC, projekt płytki PCB',
    ],
    needs: 'mechanika, podstawy programowania',
  },
  'Matematyka - Rachunek prawdopodobieństwa i statystyka': {
    about: 'Prawdopodobieństwo i statystyka z myślą o danych biologicznych i medycznych.',
    topics: [
      'Prawdopodobieństwo warunkowe, wzór Bayesa',
      'Zmienne losowe i ich rozkłady',
      'Wartość oczekiwana i wariancja',
      'Twierdzenia graniczne',
      'Estymatory i przedziały ufności',
      'Testowanie hipotez',
      'Łańcuchy Markowa',
    ],
    needs: 'rachunek różniczkowy i całkowy, macierze',
  },

  // Semestr 4
  'Biomechanika inżynierska': {
    about: 'Mechanika ludzkiego ciała: tkanki, stawy, ruch i chód oraz urządzenia rehabilitacyjne.',
    topics: [
      'Biomechanizmy i stopnie swobody',
      'Właściwości mechaniczne kości i tkanek',
      'Kinematyka i dynamika ruchu',
      'Kręgosłup i biomechanika urazów',
      'Protezy, ortezy, elektrostymulacja',
      'Analiza chodu',
    ],
    needs: 'mechanika, wytrzymałość materiałów, anatomia',
  },
  'Metody numeryczne': {
    about: 'Algorytmy numeryczne w MATLAB-ie i ocena ich dokładności. W semestrze trzy indywidualne projekty.',
    topics: [
      'MATLAB od podstaw',
      'Błędy i uwarunkowanie zadań',
      'Układy równań liniowych (eliminacja Gaussa)',
      'Równania nieliniowe (bisekcja, Newton)',
      'Interpolacja i aproksymacja',
      'Całkowanie i różniczkowanie numeryczne',
      'Równania różniczkowe (Euler, Adams, Gear)',
    ],
    needs: 'algebra, analiza, rachunek prawdopodobieństwa',
  },
  'Podstawy obrazowania medycznego': {
    about: 'Jak powstają obrazy medyczne: RTG, tomografia, scyntygrafia, rezonans magnetyczny i endoskopia.',
    topics: [
      'Powstawanie obrazu, funkcja przenoszenia',
      'Tomografia komputerowa i rekonstrukcja obrazu',
      'Scyntygrafia i tomografia emisyjna',
      'Rezonans magnetyczny',
      'Obrazy endoskopowe',
      'Obrazowanie multimodalne',
    ],
    needs: 'Radiologia (zaliczona albo równolegle)',
  },
  'Podstawy Robotyki': {
    about: 'Budowa, sterowanie i programowanie robotów oraz ich zastosowania w medycynie.',
    topics: [
      'Roboty przemysłowe, mobilne i humanoidalne',
      'Modele narządu ruchu człowieka',
      'Budowa manipulatorów i efektorów',
      'Kinematyka i planowanie trajektorii',
      'Protezy i manipulatory rehabilitacyjne',
      'Roboty chirurgiczne',
    ],
    needs: 'automatyka, elektrotechnika, elektronika',
  },
  'Sensory i pomiary wielkości nieelektrycznych': {
    about: 'Biosensory, elektrody i metody pomiaru wielkości chemicznych i fizycznych.',
    topics: [
      'Biosensory i immunosensory',
      'Elektrody i biopotencjały',
      'Miniaturowe analizatory i szybkie testy',
      'Spektrofotometria i spektrometria mas',
      'Chromatografia',
      'Pomiar pH, gęstości, lepkości, wilgotności',
    ],
    needs: 'elektrotechnika, podstawy elektroniki',
  },
  'Sygnały i systemy': {
    about: 'Teoria sygnałów i systemów ciągłych i dyskretnych - podstawa przetwarzania sygnałów.',
    topics: [
      'Splot i korelacja',
      'Systemy liniowe, odpowiedź impulsowa',
      'Transformata Fouriera, filtry',
      'Próbkowanie i aliasing',
      'DTFT, DFT i FFT',
      'Przekształcenie Z',
      'Sygnały losowe',
    ],
    needs: 'analiza, teoria obwodów, szereg Fouriera',
  },
  'Wstęp do systemów elektroniki wbudowanej': {
    about: 'Od bramek logicznych do mikrokontrolera. Na laboratorium programowanie w asemblerze.',
    topics: [
      "Algebra Boole'a i bramki logiczne",
      'Sumatory, ALU, kod U2',
      'Przerzutniki, rejestry, szyny',
      'Budowa mikroprocesora',
      'Przerwania, systemy czasu rzeczywistego',
      'Mikrokontroler 8051',
      'Laboratorium: asembler, wyświetlacz LED',
    ],
    needs: 'Metrologia, elektrotechnika, elektronika',
  },

  // Semestr 5
  'Programowalne Układy Logiczne': {
    about: 'Projektowanie układów cyfrowych w układach programowalnych (PLD) w języku VHDL.',
    topics: [
      'Układy kombinacyjne i sekwencyjne',
      'Właściwości układów scalonych',
      'Budowa układów PLD',
      'Projektowanie w narzędziach EDA',
      'Język VHDL',
      'Laboratorium: miernik częstotliwości w Quartus II',
    ],
    needs: 'Podstawy automatyki, elektronika',
  },
  'Technika mikroprocesorowa': {
    about: 'Programowanie 32-bitowych mikrokontrolerów ARM (STM32) w C/C++.',
    topics: [
      'Architektura STM32',
      'Środowiska i narzędzia uruchomieniowe',
      'Porty, pamięci, przerwania',
      'Liczniki, PWM, DMA',
      'Interfejsy: UART, SPI, I2C, USB',
      'Przetworniki A/C i C/A',
      'FreeRTOS',
    ],
    needs: 'elektronika',
  },
  'Układy elektroniczne': {
    about: 'Projektowanie elektroniki medycznej - od wzmacniacza sygnałów bioelektrycznych po płytkę PCB. Projekt prowadzi od schematu do działającego układu.',
    topics: [
      'Wzmacniacze operacyjne i instrumentalne',
      'Odbiór sygnałów bioelektrycznych, bezpieczeństwo',
      'Szumy i stabilność, symulacja SPICE',
      'Przetworniki A/C, filtry cyfrowe',
      'Projektowanie PCB, zakłócenia',
      'Projekt: np. odbiornik EKG, miernik bioimpedancji',
    ],
    needs: 'elektronika, sygnały i systemy',
  },
  'Kontrola Jakości Radiologicznych Urządzeń Diagnostycznych': {
    about: 'Testy jakości aparatów RTG, tomografów, mammografów i urządzeń medycyny nuklearnej - przygotowanie do pracy w serwisie i kontroli.',
    topics: [
      'Podstawy prawne kontroli jakości',
      'Testy podstawowe i specjalistyczne',
      'Radiografia, fluoroskopia, angiografia',
      'Tomografia i mammografia',
      'Stomatologia, densytometria, monitory',
      'Medycyna nuklearna: SPECT, PET',
    ],
    needs: 'Radiologia',
  },
  'Metoda elementów skończonych – zastosowanie w bioinżynierii': {
    about: 'Metoda elementów skończonych w praktyce: modele mechaniczne, cieplne i dynamiczne w programie ANSYS.',
    topics: [
      'Idea elementu skończonego',
      'Analiza statyczna liniowa i nieliniowa',
      'Analiza termiczna',
      'Analiza modalna i harmoniczna',
      'Zmęczenie materiału',
      'Laboratorium: ANSYS',
    ],
    needs: 'mechanika, wytrzymałość materiałów',
  },
  'Systemy długotrwałego monitorowania': {
    about: 'Holtery i inne systemy, które monitorują pacjenta podczas codziennej aktywności.',
    topics: [
      'Rejestratory holterowskie',
      'Elektrody i zakłócenia',
      'Analiza EKG: arytmia, niedokrwienie',
      'Długotrwałe EEG',
      'Ciągły pomiar ciśnienia krwi',
      'Bezdech senny, urządzenia wszczepialne',
    ],
    needs: 'elektronika, pomiary',
  },
  'Technika ultradźwiękowa w diagnostyce medycznej': {
    about: 'Jak działa USG: fale akustyczne w tkankach, głowice, obrazowanie i dopplerowski pomiar przepływu krwi.',
    topics: [
      'Fale akustyczne w tkankach',
      'Przetworniki i sondy',
      'Ogniskowanie i formowanie wiązki',
      'Tryby obrazowania: A, 2D, M, C',
      'Doppler i pomiar przepływu krwi',
      'Bezpieczeństwo, elastografia',
    ],
    needs: 'sygnały i systemy, elektronika; przyda się MATLAB',
  },
  'Techniki laserowe w biomedycynie – biofotonika': {
    about: 'Lasery w terapii i optyczne metody obrazowania, przede wszystkim tomografia OCT.',
    topics: [
      'Jak działa laser',
      'Oddziaływanie światła z tkanką',
      'Terapia laserowa',
      'Optoakustyka',
      'Optyczna tomografia koherencyjna (OCT)',
    ],
    needs: 'fizyka',
  },
  'Wprowadzenie do programowania w MATLABie': {
    about: 'MATLAB od podstaw: skrypty, funkcje, macierze i aplikacje z interfejsem graficznym (App Designer).',
    topics: [
      'Okno poleceń i typy danych',
      'Skrypty i funkcje',
      'Macierze i indeksowanie',
      'Struktury, tablice komórkowe, napisy',
      'Instrukcje sterujące',
      'Wektoryzacja i wydajność',
      'Wykresy i interfejs graficzny',
    ],
    needs: 'obsługa komputera, rachunek macierzowy',
  },
  'Elektroniczna aparatura medyczna I': {
    about: 'Przegląd aparatury medycznej: od elektrokardiografu i pulsoksymetru po respiratory i monitoring na oddziale intensywnej terapii.',
    topics: [
      'Sygnały biologiczne i elektrody',
      'Wzmacniacze bioelektryczne, zakłócenia',
      'Pomiar ciśnienia i przepływu krwi',
      'Spirometria, pulsoksymetria, kapnometria',
      'Stymulatory i defibrylatory',
      'Respiratory, dializatory',
      'Monitoring pacjenta, normy bezpieczeństwa',
    ],
    needs: 'elektronika, pomiary, anatomia',
  },
  'Laboratorium Automatyki i Robotyki': {
    about: 'Automatyka i robotyka w praktyce: regulacja, układy logiczne i pneumatyczne, programowanie robota.',
    topics: [
      'Identyfikacja obiektu regulacji',
      'Dobór nastaw regulatora',
      'Układy kombinacyjne i przekaźnikowe',
      'Układy pneumatyczne',
      'Programowanie robota przemysłowego',
    ],
    needs: 'Podstawy automatyki, Podstawy robotyki',
  },

  // Semestr 6
  'Cyfrowe przetwarzanie obrazów': {
    about: 'Algorytmy przetwarzania obrazów i ich zastosowania w medycynie. Na laboratorium MATLAB.',
    topics: [
      'Próbkowanie i interpolacja obrazu',
      'Filtracja w dziedzinie przestrzeni i częstotliwości',
      'Operacje morfologiczne',
      'Histogram i segmentacja',
      'Kompresja, formaty JPEG, GIF, TIFF',
      'DICOM',
    ],
    needs: 'sygnały i systemy; przyda się MATLAB',
  },
  'Pracownia problemowa': {
    about: 'Projekt prostego urządzenia elektromedycznego, np. wzmacniacza EEG, kardiotachometru albo wzmacniacza do wspomagania słuchu.',
    needs: 'elektronika, aparatura medyczna',
  },
  'Praktyka przeddyplomowa': {
    about: 'Praktyka w firmie - zakres zależy od miejsca praktyki.',
  },

  // Semestr 7
  'Praca dyplomowa': {
    about: 'Samodzielne rozwiązanie problemu inżynierskiego pod opieką promotora.',
  },
  'Seminarium dyplomowe': {
    about: 'Jak napisać i przedstawić pracę inżynierską.',
    topics: [
      'Zasady dyplomowania',
      'Budowa i redakcja pracy',
      'Korzystanie ze źródeł, prawo autorskie',
      'Prezentacja założeń i postępów pracy',
    ],
    needs: 'temat pracy i promotor',
  },
}
