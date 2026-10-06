// Zaliczenie przedmiotów Inżynierii Biomedycznej - rozpiska z "Metod oceny" w sylabusach (Katalog ECTS 2021/22).
// Do uzupełnienia z regulaminów przedmiotów (liczba kolokwiów, punkty, progi) - wtedy zmienia się source.
// Klucz: nazwa przedmiotu w programie (src/lib/programs/ib.ts).
import type { AssessmentRow, CourseAssessment } from '../assessment'

const SYLLABUS = 'sylabus 2021/22'

const colloquia = (count?: number): AssessmentRow['add'] => ({ kind: 'kolokwium', title: 'Kolokwium', count })
const tests = (count?: number, title = 'Sprawdzian'): AssessmentRow['add'] => ({ kind: 'kolokwium', title, count })
// Osobny tytuł, żeby nie mylić z kolokwiami na ćwiczeniach.
const lectureColloquium: AssessmentRow['add'] = { kind: 'kolokwium', title: 'Kolokwium wykładowe', count: 1 }
const exam: AssessmentRow['add'] = { kind: 'egzamin', title: 'Egzamin', count: 1 }
const GRADES_100 = 'Na 100 pkt: 51–60 → 3; 61–70 → 3,5; 71–80 → 4; 81–90 → 4,5; 91–100 → 5'

const a = (rows: AssessmentRow[], grading?: string): CourseAssessment => ({ rows, grading, source: SYLLABUS })

export const ASSESSMENTS: Record<string, CourseAssessment> = {
  // Semestr 1
  'Anatomia i fizjologia': a([{ form: 'ALL', text: 'kolokwia', add: colloquia() }]),
  Metrologia: a([
    { form: 'ALL', text: '2 kolokwia: z analizy błędów i końcowe', add: colloquia(2) },
    { form: 'LAB', text: 'ocena pracy na laboratorium' },
  ]),
  'Propedeutyka medycyny': a([
    { form: 'ALL', text: 'test końcowy', add: tests(1, 'Test końcowy') },
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
  Biomateriały: a([{ form: 'ALL', text: '2 sprawdziany w semestrze', add: tests(2) }]),
  'Fizykomedyczne podstawy inżynierii biomedycznej': a([{ form: 'ALL', text: 'kolokwia', add: colloquia() }]),
  'Programowanie obiektowe': a(
    [
      { form: 'WYK', text: '2 sprawdziany po 20 pkt', add: tests(2) },
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
      { form: 'CWI', text: 'krótkie sprawdziany – 10 pkt' },
      { form: 'ALL', text: '2 kolokwia po 20 pkt', add: colloquia(2) },
      { form: 'ALL', text: 'egzamin – 50 pkt (20 zadania, 30 test)', add: exam },
    ],
    GRADES_100,
  ),

  // Semestr 3
  'Grafika komputerowa': a([
    { form: 'WYK', text: 'kolokwia', add: colloquia() },
    { form: 'LAB', text: 'praca na zajęciach i sprawozdania' },
  ]),
  'Laboratorium elektrotechniki': a(
    [{ form: 'LAB', text: '5 ćwiczeń; każde: praca domowa 20%, wejściówka 30%, sprawozdanie 50%' }],
    'Średnia z ćwiczeń: 51–60% → 3; 61–70% → 4; 71–80% → 4,5; 81–90% → 5',
  ),
  'Podstawy Automatyki': a([
    { form: 'CWI', text: 'kolokwia', add: colloquia() },
    { form: 'ALL', text: 'egzamin końcowy', add: exam },
  ]),
  'Podstawy elementów i układów elektronicznych': a([
    { form: 'ALL', text: 'kolokwia', add: colloquia() },
    { form: 'ALL', text: 'egzamin', add: exam },
  ]),
  Radiologia: a([
    { form: 'WYK', text: 'egzamin', add: exam },
    { form: 'LAB', text: 'sprawdziany i sprawozdania' },
  ]),
  'Wspomagane komputerowo projektowanie inżynierskie': a([
    { form: 'ALL', text: '2 kolokwia', add: colloquia(2) },
    { form: 'ALL', text: 'ocena pracy na zajęciach' },
  ]),
  'Matematyka - Rachunek prawdopodobieństwa i statystyka': a([
    { form: 'ALL', text: '3 kolokwia', add: colloquia(3) },
    { form: 'ALL', text: 'egzamin', add: exam },
  ]),

  // Semestr 4
  'Biomechanika inżynierska': a([
    { form: 'WYK', text: 'egzamin: test wyboru z pytaniami otwartymi', add: exam },
    { form: 'LAB', text: 'sprawdzenie przygotowania przed ćwiczeniami' },
  ]),
  'Metody numeryczne': a([
    { form: 'ALL', text: '2 sprawdziany', add: tests(2) },
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
    { form: 'WYK', text: '2 kolokwia', add: colloquia(2) },
    { form: 'CWI', text: '2 sprawdziany', add: tests(2) },
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
    { form: 'LAB', text: 'sprawdziany i sprawozdania' },
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
    { form: 'LAB', text: 'sprawdziany i sprawozdania' },
  ]),
  'Laboratorium Automatyki i Robotyki': a([
    { form: 'LAB', text: 'sprawdziany z ćwiczeń, praca na zajęciach, sprawozdania' },
  ]),

  // Semestr 6
  'Cyfrowe przetwarzanie obrazów': a([
    { form: 'WYK', text: 'sprawdzian końcowy – 50%', add: tests(1, 'Sprawdzian końcowy') },
    { form: 'LAB', text: 'protokoły i sprawdziany po ćwiczeniach – 50%' },
  ]),
  'Pracownia problemowa': a([{ form: 'PRO', text: 'etapy projektu oceniane na podstawie sprawozdań' }]),
  'Praktyka przeddyplomowa': a([{ form: 'ALL', text: 'sprawozdanie z praktyki – zaliczona albo nie' }]),

  // Semestr 7
  'Praca dyplomowa': a([{ form: 'ALL', text: 'opinia opiekuna i recenzja' }]),
  'Seminarium dyplomowe': a([{ form: 'ALL', text: 'prezentacje, opracowanie pisemne i udział w dyskusji' }]),
}
