// Zaliczenie przedmiotów Inżynierii Biomedycznej. Z regulaminów przedmiotów (2026/27), gdy je mamy -
// liczba kolokwiów, punkty, progi; pozostałe z "Metod oceny" w sylabusach (Katalog ECTS 2021/22).
// Samych regulaminów nie publikujemy (są dla zalogowanych w USOS) - tylko te zasady.
// Klucz: nazwa przedmiotu w programie (src/lib/programs/ib.ts).
import type { AssessmentRow, CourseAssessment } from '../assessment'

const SYLLABUS = { kind: 'sylabus', year: '2021/22' } as const
const REGULATIONS = { kind: 'regulamin', year: '2026/27' } as const

const colloquia = (count?: number): AssessmentRow['add'] => ({ kind: 'kolokwium', title: 'Kolokwium', count })
// Osobny tytuł, żeby nie mylić z kolokwiami na ćwiczeniach.
const lectureColloquium: AssessmentRow['add'] = { kind: 'kolokwium', title: 'Kolokwium wykładowe', count: 1 }
const exam: AssessmentRow['add'] = { kind: 'egzamin', title: 'Egzamin', count: 1 }
const GRADES_100 = 'Na 100 pkt: 51–60 → 3; 61–70 → 3,5; 71–80 → 4; 81–90 → 4,5; 91–100 → 5'

const a = (rows: AssessmentRow[], grading?: string): CourseAssessment => ({ rows, grading, source: SYLLABUS })
const r = (assessment: Omit<CourseAssessment, 'source'>): CourseAssessment => ({ ...assessment, source: REGULATIONS })

const BASE: Record<string, CourseAssessment> = {
  // Semestr 1
  'Anatomia i fizjologia': a([{ form: 'ALL', text: 'kolokwia', add: colloquia() }]),
  Metrologia: a([
    { form: 'ALL', text: '2 kolokwia: z analizy błędów i końcowe', add: colloquia(2) },
    { form: 'LAB', text: 'ocena pracy na laboratorium' },
  ]),
  'Propedeutyka medycyny': a([
    { form: 'ALL', text: 'test końcowy', add: { kind: 'kolokwium', title: 'Test końcowy', count: 1 } },
    { form: 'CWI', text: 'prezentacja wybranego zagadnienia medycznego', add: { kind: 'inne', title: 'Prezentacja', count: 1 } },
  ]),
  'Podstawy programowania': a([
    { form: 'ALL', text: 'kolokwium – 40% oceny', add: colloquia(1) },
    { form: 'LAB', text: 'ocena z laboratorium – 60% oceny' },
  ]),
  'Fizyka 1': a([
    { form: 'WYK', text: 'kolokwium w połowie semestru (liczy się do egzaminu)', add: lectureColloquium },
    { form: 'CWI', text: '2 kolokwia', add: colloquia(2) },
    { form: 'LAB', text: 'kolokwium przed każdym ćwiczeniem i sprawozdania' },
    { form: 'ALL', text: 'egzamin', add: exam },
  ]),
  'Matematyka - Algebra liniowa': a([{ form: 'ALL', text: 'egzamin', add: exam }]),
  'Matematyka - Analiza I': a([{ form: 'ALL', text: 'egzamin', add: exam }]),
  Materiałoznawstwo: a([{ form: 'ALL', text: 'kolokwia', add: colloquia() }]),
  'Szkolenie BHP': a([{ form: 'ALL', text: 'test' }]),

  // Semestr 2
  Biomateriały: a([{ form: 'ALL', text: '2 kolokwia w semestrze', add: colloquia(2) }]),
  'Fizykomedyczne podstawy inżynierii biomedycznej': a([{ form: 'ALL', text: 'kolokwia', add: colloquia() }]),
  'Programowanie obiektowe': a(
    [
      { form: 'WYK', text: '2 kolokwia po 20 pkt', add: colloquia(2) },
      { form: 'LAB', text: '60 pkt' },
    ],
    'Na 100 pkt: 0–50 → 2; 51–60 → 3; 61–70 → 3,5; 71–80 → 4; 81–90 → 4,5; 91–100 → 5',
  ),
  'Fizyka 2': a([
    { form: 'WYK', text: 'kolokwium w połowie semestru', add: lectureColloquium },
    { form: 'CWI', text: '2 kolokwia', add: colloquia(2) },
    { form: 'ALL', text: 'egzamin pisemny', add: exam },
  ]),
  'Matematyka - Analiza 2': a([
    { form: 'ALL', text: '3 kolokwia', add: colloquia(3) },
    { form: 'ALL', text: 'egzamin', add: exam },
  ]),
  'Mechanika i Wytrzymałość materiałów': a([
    { form: 'CWI', text: 'kolokwia – 50% oceny', add: colloquia() },
    { form: 'ALL', text: 'egzamin – 50% oceny', add: exam },
  ]),
  'Wstęp do elektrotechniki': a(
    [
      { form: 'CWI', text: 'kartkówki – 10 pkt' },
      { form: 'ALL', text: '2 kolokwia po 20 pkt', add: colloquia(2) },
      { form: 'ALL', text: 'egzamin – 50 pkt (20 zadania, 30 test)', add: exam },
    ],
    GRADES_100,
  ),

  // Semestr 3
  'Grafika komputerowa': r({
    rows: [
      { form: 'WYK', text: 'kolokwium pisemne (120 min) – 20 pkt, bez pomocy', add: colloquia(1) },
      { form: 'LAB', text: '5 ćwiczeń po 6 pkt (razem 30 pkt), mogą być wejściówki' },
    ],
    grading: 'Suma do 50 pkt: 25–29 → 3; 30–34 → 3,5; 35–39 → 4; 40–44 → 4,5; od 45 → 5',
    notes: [
      'Kolokwium 2 tygodnie po ostatnim wykładzie, w godzinach wykładu; drugi termin tydzień później – liczy się ostatnie podejście',
      'Laboratorium bez limitu nieobecności; odrobić można tylko w uzasadnionych przypadkach, ocen nie da się poprawić',
    ],
  }),
  'Laboratorium elektrotechniki': a(
    [{ form: 'LAB', text: '5 ćwiczeń; każde: praca domowa 20%, wejściówka 30%, sprawozdanie 50%' }],
    'Średnia z ćwiczeń: 51–60% → 3; 61–70% → 4; 71–80% → 4,5; 81–90% → 5',
  ),
  'Podstawy Automatyki': r({
    rows: [
      { form: 'WYK', text: 'egzamin pisemny – 55 pkt, zalicza 27,5 pkt', add: exam },
      { form: 'WYK', text: 'do 8 pkt za aktywność i testy na LeOnie (do oceny, nie do zaliczenia)' },
      { form: 'CWI', text: '7 ćwiczeń laboratoryjnych po 5 pkt: wejściówka, praca, sprawozdanie' },
      { form: 'CWI', text: 'każde ćwiczenie min. 2,5 pkt; trzeba zaliczyć 6 i mieć razem min. 17,5 pkt' },
    ],
    grading: 'Suma do 90 pkt (+ aktywność): ponad 45 → 3; ponad 54 → 3,5; ponad 63 → 4; ponad 72 → 4,5; ponad 81 → 5',
    notes: [
      'Obecność na ćwiczeniach obowiązkowa – najwyżej 1 nieusprawiedliwiona nieobecność (usprawiedliwienie w ciągu tygodnia)',
      'Sprawozdanie zespołowe w ciągu 10 dni roboczych od ćwiczenia',
      'Pod koniec semestru można poprawić jedno ćwiczenie (czasem w sobotę)',
    ],
  }),
  'Podstawy elementów i układów elektronicznych': r({
    rows: [
      { form: 'ALL', text: 'egzamin pisemny – 60 pkt (elementy i układy), zalicza 31 pkt; bez pomocy', add: exam },
      { form: 'CWI', text: 'obowiązkowe – bez nich nie ma egzaminu; kolokwiów nie ma' },
    ],
    grading: 'Z egzaminu: 31–36 → 3; 37–42 → 3,5; 43–48 → 4; 49–54 → 4,5; ponad 54 → 5',
    notes: [
      'Najwyżej 2 nieusprawiedliwione nieobecności na ćwiczeniach',
      'Wynik egzaminu poprawkowego zastępuje poprzedni',
    ],
  }),
  Radiologia: r({
    rows: [
      { form: 'WYK', text: 'egzamin – test, 30 pkt, zalicza 16 pkt; bez pomocy i AI', add: exam },
      { form: 'LAB', text: 'zajęcia po 8 pkt: wejściówka 2 + sprawozdanie 6; razem 40 pkt, zalicza 21 pkt' },
    ],
    grading: 'Średnia egzaminu i laboratorium (po 50%): od 51% → 3; 61% → 3,5; 71% → 4; 81% → 4,5; 91% → 5',
    notes: [
      'Laboratorium: obecność na wszystkich zajęciach i wszystkie sprawozdania (oddawane na kolejnych zajęciach) – bez poprawek',
      'Trzeba zapisać się do zespołu laboratoryjnego w wyznaczonym terminie',
      'Papierowa instrukcja na zajęciach; w sprawozdaniu oświadczenie o autorstwie; AI tylko do korekty językowej',
    ],
  }),
  'Wspomagane komputerowo projektowanie inżynierskie': r({
    rows: [
      { form: 'WYK', text: '2 kolokwia z teorii – 50% oceny', add: colloquia(2) },
      { form: 'LAB', text: 'zadania laboratoryjne – 25% oceny' },
      { form: 'PRO', text: 'indywidualny projekt według wytycznych z pierwszych zajęć – 25% oceny' },
    ],
    grading: 'Każda część osobno: ponad 50% → 3; 60% → 3,5; 70% → 4; 80% → 4,5; 90% → 5 – wszystkie muszą przekroczyć 50%',
    notes: [
      'Terminy kolokwiów podawane w pierwszych 2 tygodniach zajęć (Teams, LeOn)',
      'Zajęć laboratoryjnych i projektowych nie da się odrobić',
      'Konsultacje pół godziny przed każdymi zajęciami',
    ],
  }),
  'Matematyka - Rachunek prawdopodobieństwa i statystyka': r({
    rows: [
      { form: 'CWI', text: '2 kolokwia po 16 pkt (I: zestawy 1–5, II: 6–10), bez poprawy', add: colloquia(2) },
      { form: 'CWI', text: 'do 8 pkt za zadania przy tablicy – razem z ćwiczeń 40 pkt' },
      { form: 'ALL', text: 'egzamin pisemny – trzeba mieć ponad 30 pkt', add: exam },
    ],
    grading:
      'Ćwiczenia + egzamin (do 100 pkt): 51–60 → 3; 61–70 → 3,5; 71–80 → 4; 81–90 → 4,5; ponad 90 → 5. ' +
      'Bez egzaminu: min. 12 pkt z każdego kolokwium i ponad 32 pkt z ćwiczeń → 4,5 (do 36 pkt) albo 5',
    notes: [
      'Obecność na ćwiczeniach obowiązkowa – najwyżej 2 nieusprawiedliwione nieobecności',
      'Na kolokwia i egzamin: prosty kalkulator, własna kartka A4 z wzorami, legitymacja, kartki A4',
      'Nieobecność na kolokwium usprawiedliwić u prowadzącego najpóźniej tydzień po',
    ],
  }),

  // Semestr 4
  'Biomechanika inżynierska': a([
    { form: 'WYK', text: 'egzamin: test wyboru z pytaniami otwartymi', add: exam },
    { form: 'LAB', text: 'wejściówki przed ćwiczeniami' },
  ]),
  'Metody numeryczne': a([
    { form: 'ALL', text: '2 kolokwia', add: colloquia(2) },
    { form: 'PRO', text: '3 zadania projektowe z konsultacjami', add: { kind: 'projekt', title: 'Projekt', count: 3 } },
  ]),
  'Podstawy obrazowania medycznego': a(
    [
      { form: 'WYK', text: 'egzamin', add: exam },
      { form: 'LAB', text: 'średnia ze wszystkich ćwiczeń; 2 niezaliczone = brak zaliczenia' },
    ],
    'Ocena końcowa: średnia ważona egzaminu i laboratorium – trzeba zaliczyć oba',
  ),
  'Podstawy Robotyki': a([{ form: 'ALL', text: '2 kolokwia', add: colloquia(2) }]),
  'Sensory i pomiary wielkości nieelektrycznych': a([
    { form: 'ALL', text: 'egzamin', add: exam },
    { form: 'LAB', text: 'oceny z ćwiczeń' },
  ]),
  'Sygnały i systemy': a([
    { form: 'WYK', text: '2 kolokwia', add: { kind: 'kolokwium', title: 'Kolokwium wykładowe', count: 2 } },
    { form: 'CWI', text: '2 kolokwia', add: colloquia(2) },
  ]),
  'Wstęp do systemów elektroniki wbudowanej': a([
    { form: 'ALL', text: 'kolokwia', add: colloquia() },
    { form: 'LAB', text: 'sprawozdania i kartkówki' },
  ]),

  // Semestr 5
  'Programowalne Układy Logiczne': a([
    { form: 'ALL', text: 'kolokwium', add: colloquia(1) },
    { form: 'LAB', text: 'ocena zadań na zajęciach' },
  ]),
  'Technika mikroprocesorowa': a([
    { form: 'ALL', text: 'egzamin', add: exam },
    { form: 'LAB', text: 'ocena ćwiczeń' },
  ]),
  'Układy elektroniczne': a([
    { form: 'ALL', text: 'egzamin', add: exam },
    { form: 'LAB', text: 'sprawozdania' },
    { form: 'PRO', text: 'sprawozdania z projektu' },
  ]),
  'Kontrola Jakości Radiologicznych Urządzeń Diagnostycznych': a([
    { form: 'WYK', text: 'kolokwium', add: colloquia(1) },
    { form: 'LAB', text: 'wejściówki i sprawozdania' },
  ]),
  'Metoda elementów skończonych – zastosowanie w bioinżynierii': a([
    { form: 'WYK', text: 'kolokwium – 40% oceny', add: colloquia(1) },
    { form: 'LAB', text: 'zadanie projektowe – 60% oceny' },
  ]),
  'Systemy długotrwałego monitorowania': a([{ form: 'ALL', text: 'testy' }]),
  'Technika ultradźwiękowa w diagnostyce medycznej': a([{ form: 'ALL', text: 'kolokwium', add: colloquia(1) }]),
  'Techniki laserowe w biomedycynie – biofotonika': a([{ form: 'ALL', text: '2 kolokwia', add: colloquia(2) }]),
  'Wprowadzenie do programowania w MATLABie': a([
    { form: 'ALL', text: 'kolokwium', add: colloquia(1) },
    { form: 'LAB', text: 'ocena zadań na zajęciach' },
  ]),
  'Elektroniczna aparatura medyczna I': a([
    { form: 'WYK', text: 'egzamin', add: exam },
    { form: 'LAB', text: 'wejściówki i sprawozdania' },
  ]),
  'Laboratorium Automatyki i Robotyki': a([
    { form: 'LAB', text: 'wejściówki, praca na zajęciach, sprawozdania' },
  ]),

  // Semestr 6
  'Cyfrowe przetwarzanie obrazów': a([
    { form: 'WYK', text: 'kolokwium końcowe – 50%', add: { kind: 'kolokwium', title: 'Kolokwium końcowe', count: 1 } },
    { form: 'LAB', text: 'protokoły i kartkówki po ćwiczeniach – 50%' },
  ]),
  'Pracownia problemowa': a([{ form: 'PRO', text: 'etapy projektu oceniane na podstawie sprawozdań' }]),
  'Praktyka przeddyplomowa': a([{ form: 'ALL', text: 'sprawozdanie z praktyki – zaliczona albo nie' }]),

  // Semestr 7
  'Praca dyplomowa': a([{ form: 'ALL', text: 'opinia opiekuna i recenzja' }]),
  'Seminarium dyplomowe': a([{ form: 'ALL', text: 'prezentacje, opracowanie pisemne i udział w dyskusji' }]),
}

// Jedna linijka na liście przedmiotów - krótko, żeby zmieściła się na telefonie.
const SHORT: Record<string, string> = {
  'Anatomia i fizjologia': 'kolokwia',
  Metrologia: '2 kolokwia · laboratorium',
  'Propedeutyka medycyny': 'test końcowy · prezentacja',
  'Podstawy programowania': 'kolokwium 40% · lab. 60%',
  'Fizyka 1': 'kolokwia · lab. · egzamin',
  'Matematyka - Algebra liniowa': 'egzamin',
  'Matematyka - Analiza I': 'egzamin',
  Materiałoznawstwo: 'kolokwia',
  'Szkolenie BHP': 'test',
  Biomateriały: '2 kolokwia',
  'Fizykomedyczne podstawy inżynierii biomedycznej': 'kolokwia',
  'Programowanie obiektowe': '2 kolokwia 40 pkt · lab. 60 pkt',
  'Fizyka 2': 'kolokwia · egzamin',
  'Matematyka - Analiza 2': '3 kolokwia · egzamin',
  'Mechanika i Wytrzymałość materiałów': 'kolokwia 50% · egzamin 50%',
  'Wstęp do elektrotechniki': 'kolokwia 40 pkt · egzamin 50 pkt',
  'Grafika komputerowa': 'kolokwium 20 pkt · lab. 30 pkt',
  'Laboratorium elektrotechniki': '5 ćwiczeń laboratoryjnych',
  'Podstawy Automatyki': 'egzamin 55 pkt · lab. 35 pkt',
  'Podstawy elementów i układów elektronicznych': 'tylko egzamin (60 pkt)',
  Radiologia: 'egzamin 30 pkt · lab. 40 pkt',
  'Wspomagane komputerowo projektowanie inżynierskie': '2 kolokwia · lab. · projekt',
  'Matematyka - Rachunek prawdopodobieństwa i statystyka': '2 kolokwia · egzamin / zwolnienie',
  'Biomechanika inżynierska': 'egzamin · laboratorium',
  'Metody numeryczne': '2 kolokwia · 3 projekty',
  'Podstawy obrazowania medycznego': 'egzamin · laboratorium',
  'Podstawy Robotyki': '2 kolokwia',
  'Sensory i pomiary wielkości nieelektrycznych': 'egzamin · laboratorium',
  'Sygnały i systemy': 'kolokwia: 2 wyk. + 2 ćw.',
  'Wstęp do systemów elektroniki wbudowanej': 'kolokwia · laboratorium',
  'Programowalne Układy Logiczne': 'kolokwium · laboratorium',
  'Technika mikroprocesorowa': 'egzamin · laboratorium',
  'Układy elektroniczne': 'egzamin · lab. · projekt',
  'Kontrola Jakości Radiologicznych Urządzeń Diagnostycznych': 'kolokwium · laboratorium',
  'Metoda elementów skończonych – zastosowanie w bioinżynierii': 'kolokwium 40% · projekt 60%',
  'Systemy długotrwałego monitorowania': 'testy',
  'Technika ultradźwiękowa w diagnostyce medycznej': 'kolokwium',
  'Techniki laserowe w biomedycynie – biofotonika': '2 kolokwia',
  'Wprowadzenie do programowania w MATLABie': 'kolokwium · laboratorium',
  'Elektroniczna aparatura medyczna I': 'egzamin · laboratorium',
  'Laboratorium Automatyki i Robotyki': 'ćwiczenia lab. i sprawozdania',
  'Cyfrowe przetwarzanie obrazów': 'kolokwium 50% · lab. 50%',
  'Pracownia problemowa': 'projekt etapami',
  'Praktyka przeddyplomowa': 'sprawozdanie z praktyki',
  'Praca dyplomowa': 'opinia i recenzja',
  'Seminarium dyplomowe': 'prezentacje i praca pisemna',
}

export const ASSESSMENTS: Record<string, CourseAssessment> = Object.fromEntries(
  Object.entries(BASE).map(([name, assessment]) => [name, { ...assessment, summary: SHORT[name] ?? assessment.summary }]),
)
