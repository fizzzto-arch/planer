import { useState, type ReactNode } from 'react'

interface Props {
  onBack: () => void
}

const REPO_URL = 'https://github.com/fizzzto-arch/planer'

function Fact({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="help-fact">
      <span className="help-fact-icon" aria-hidden="true">
        {icon}
      </span>
      <span>
        <strong>{title}</strong>
        <span className="muted">{children}</span>
      </span>
    </li>
  )
}

function Question({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="faq">
      <summary>{q}</summary>
      <div className="faq-answer">{children}</div>
    </details>
  )
}

const icon = (d: string) => (
  <svg viewBox="0 0 24 24">
    <path d={d} />
  </svg>
)

// Pomoc i prywatność: co Planer zapisuje, kto to widzi, jak to sprawdzić + najczęstsze pytania.
export function HelpView({ onBack }: Props) {
  return (
    <section className="help">
      <button type="button" className="back-button" onClick={onBack}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Wróć
      </button>

      <header className="course-header">
        <h2>Pomoc i prywatność</h2>
        <p className="muted">
          Planer to nieoficjalny, darmowy organizer planu zajęć dla studentów PW. Poniżej wszystko o tym, co dzieje
          się z Twoimi danymi, i odpowiedzi na najczęstsze pytania.
        </p>
      </header>

      <div className="panel">
        <h3 className="panel-title">W skrócie</h3>
        <ul className="help-facts">
          <Fact icon={icon('M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z')} title="Twoje dane widzisz tylko Ty">
            Notatki, terminy, zmiany w planie i ustawienia są przypisane do Twojego konta. Reguły bazy nie wpuszczają
            do nich nikogo innego - także administratora Planera.
          </Fact>
          <Fact icon={icon('M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6z')} title="Hasło zna tylko Google">
            Logowaniem zajmuje się Google Firebase. Hasło jest przechowywane w postaci zaszyfrowanej - nie widzi go nikt,
            łącznie z administratorem.
          </Fact>
          <Fact icon={icon('M4 4l16 16M9.9 5.1A9 9 0 0 1 21 12a9 9 0 0 1-2 3.3M6.3 6.3A9 9 0 0 0 3 12a9 9 0 0 0 14 5.7')} title="Bez reklam i śledzenia">
            Planer nie ma reklam, analityki ani ciasteczek śledzących. Nic nie jest sprzedawane ani udostępniane dalej.
          </Fact>
          <Fact icon={icon('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3')} title="Możesz wszystko usunąć">
            Ustawienia → Konto → „Usuń konto” kasuje konto i wszystkie dane, od razu i na zawsze.
          </Fact>
        </ul>
      </div>

      <div className="panel">
        <h3 className="panel-title">Co i gdzie jest zapisane</h3>
        <dl className="help-table">
          <dt>Na Twoim urządzeniu</dt>
          <dd>
            Kopia planu, ustawienia i pliki PDF dodane „tylko na tym urządzeniu”. Dzięki temu Planer działa też bez
            internetu. Bez konta wszystko zostaje wyłącznie tutaj.
          </dd>
          <dt>Na Twoim koncie (Google Firebase)</dt>
          <dd>
            Adres e-mail, link do planu z USOS, notatki, terminy, zmiany w planie, własne zajęcia, ustawienia i lista
            urządzeń z włączonymi przypomnieniami. Tylko dla Ciebie.
          </dd>
          <dt>Widoczne dla innych</dt>
          <dd>
            Tylko pliki, które sam udostępnisz grupie w materiałach przedmiotu - widzą je osoby z dostępem do Planera,
            razem z początkiem Twojego e-maila (część przed @) jako autorem.
          </dd>
          <dt>Widoczne dla administratora</dt>
          <dd>Lista kont proszących o dostęp: e-mail i status (czeka / zatwierdzone), żeby mógł je zatwierdzać.</dd>
        </dl>
      </div>

      <div className="panel">
        <h3 className="panel-title">Kto ma dostęp - uczciwie</h3>
        <ul className="plain-list help-list">
          <li>
            <strong>Aplikacja nie pozwala nikomu czytać Twoich prywatnych danych</strong> - pilnują tego reguły bazy
            Firebase, a nie tylko kod strony.
          </li>
          <li>
            Właściciel projektu Firebase (administrator Planera) ma - jak właściciel każdego serwisu internetowego -
            techniczny dostęp do konsoli bazy. Nie przegląda danych i nie ma do tego żadnej funkcji w aplikacji.
          </li>
          <li>
            <strong>Link do planu z USOS</strong> pozwala tylko odczytać plan zajęć. Nie daje dostępu do konta USOS,
            ocen ani danych osobowych. Mimo to nie udostępniaj go publicznie.
          </li>
          <li>
            <strong>Przypomnienia:</strong> jeśli je włączysz, serwer co kwadrans sprawdza Twoje terminy, żeby wysłać
            powiadomienie (tytuł, przedmiot i godzina) przez usługę powiadomień Apple albo Google.
          </li>
          <li>
            <strong>Zmiany w planie, plan dnia:</strong> przy włączonych powiadomieniach serwer co ok. 2 godziny
            pobiera Twój plan z USOS (przez Twój link) i pamięta najbliższe 3 tygodnie, żeby zauważyć zmiany. Po
            wyłączeniu powiadomień albo usunięciu konta ta kopia jest usuwana. Możesz to wyłączyć w Ustawieniach →
            Przypomnienia.
          </li>
        </ul>
      </div>

      <div className="panel">
        <h3 className="panel-title">Sprawdź to sam</h3>
        <ul className="plain-list help-list">
          <li>
            Cały kod Planera jest publiczny:{' '}
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              github.com/fizzzto-arch/planer
            </a>
            .
          </li>
          <li>
            Reguły bazy, które decydują, kto co może czytać, są w pliku{' '}
            <a href={`${REPO_URL}/blob/main/firestore.rules`} target="_blank" rel="noreferrer">
              firestore.rules
            </a>{' '}
            - z opisem po polsku.
          </li>
          <li>
            W przeglądarce na komputerze (F12 → Sieć) zobaczysz, że strona łączy się tylko z trzema miejscami: tą
            stroną (github.io), usługami Google Firebase (konto i dane) i USOS-em PW (plan zajęć).
          </li>
        </ul>
      </div>

      <div className="panel">
        <h3 className="panel-title">Najczęstsze pytania</h3>
        <Question q="Czy to oficjalna aplikacja Politechniki?">
          Nie. Planer jest nieoficjalny - korzysta z Twojego linku do planu z USOSweb i publicznych danych USOS. W razie
          wątpliwości co do terminu zajęć rozstrzyga USOS.
        </Question>
        <Question q="Czy muszę zakładać konto?">
          Nie. Sam plan działa bez konta - wystarczy wkleić link z USOSweb. Konto przydaje się do notatek, terminów,
          przypomnień, wspólnych plików i do tego, żeby ten sam plan był na telefonie i komputerze.
        </Question>
        <Question q="Czy mogę zalogować się przez Google?">
          Konto zakładasz na dowolny adres e-mail - także Gmail - z własnym hasłem. Osobnego przycisku „Zaloguj przez
          Google” nie ma, bo na iPhonie w aplikacji dodanej do ekranu początkowego takie logowanie działa zawodnie.
        </Question>
        <Question q="Dlaczego muszę potwierdzić e-mail i czekać na zatwierdzenie?">
          Planer jest dla zamkniętej grupy znajomych. Link w mailu potwierdza, że adres należy do Ciebie, a
          zatwierdzenie przez administratora - że jesteś w tej grupie. Mail z linkiem może trafić do spamu.
        </Question>
        <Question q="Nie pamiętam hasła">
          Na ekranie logowania wpisz e-mail i wybierz „Nie pamiętam hasła” - przyjdzie link do ustawienia nowego.
        </Question>
        <Question q="Co robi „Zapamiętaj mnie na tym urządzeniu”?">
          Zaznaczone: zostajesz zalogowany na stałe (jak w aplikacji). Odznaczone - np. na komputerze w bibliotece -
          po zamknięciu przeglądarki Planer wyloguje Cię i usunie z tego komputera wszystkie swoje dane.
        </Question>
        <Question q="Jak dodać Planer do ekranu telefonu?">
          iPhone: otwórz stronę w Safari → Udostępnij → „Do ekranu początkowego”. Android: w Chrome menu ⋮ →
          „Zainstaluj aplikację” albo „Dodaj do ekranu głównego”. Planer otwiera się wtedy jak zwykła aplikacja.
        </Question>
        <Question q="Plan się zmienił w USOS - co z Planerem?">
          Planer pobiera plan z USOS przy każdym otwarciu, więc zmiany pojawią się same. Twoje ręczne zmiany i notatki
          zostają. Stan widać pod zakładkami („Zaktualizowano…”), tam też jest „Odśwież”.
        </Question>
        <Question q="Skąd Planer wie, który tydzień jest parzysty?">
          Liczy tygodnie po kolei od pierwszego tygodnia z zajęciami, także przez przerwy - tak samo, jak USOS układa
          zajęcia „co dwa tygodnie”. Jeśli numer nie zgadza się z kalendarzem uczelni, daj znać.
        </Question>
        <Question q="Nie przychodzą przypomnienia">
          Sprawdź w Ustawieniach → Przypomnienia, czy na tym urządzeniu są włączone, i wyślij próbne. Na iPhonie
          działają tylko w Planerze dodanym do ekranu początkowego, a w ustawieniach telefonu (Powiadomienia → Planer)
          muszą być dozwolone. Przypomnienie może przyjść kilkanaście minut później.
        </Question>
        <Question q="Jak usunąć konto i dane?">
          Ustawienia → Konto → „Usuń konto”. Po podaniu hasła znikają: konto, notatki, terminy, zmiany, ustawienia,
          Twoje udostępnione pliki i dane zapisane na tym urządzeniu. Wcześniej możesz pobrać kopię zapasową.
        </Question>
        <Question q="Ile to kosztuje?">Nic - Planer jest darmowy, bez reklam i płatnych funkcji.</Question>
      </div>

      <ReportProblem />
    </section>
  )
}

// Informacje o urządzeniu do zgłoszenia problemu - bez danych osobowych, tylko wersja i sprzęt.
function diagnostics(): string {
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  const notifications = 'Notification' in window ? Notification.permission : 'brak'
  return [
    `Planer ${__APP_VERSION__}`,
    `tryb: ${standalone ? 'aplikacja z ekranu początkowego' : 'przeglądarka'}`,
    `ekran: ${window.innerWidth}×${window.innerHeight}`,
    `powiadomienia: ${notifications}`,
    `przeglądarka: ${navigator.userAgent}`,
  ].join('\n')
}

function ReportProblem() {
  const [copied, setCopied] = useState<boolean | null>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(diagnostics())
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="panel help-report">
      <h3 className="panel-title">Coś nie działa?</h3>
      <p className="hint">
        Napisz do osoby, która dała Ci dostęp do Planera, co się stało i kiedy. Dołącz informacje o urządzeniu - bez
        nich trudno powtórzyć problem. Nie zawierają żadnych Twoich danych, tylko wersję Planera i sprzęt.
      </p>
      <button type="button" className="button secondary" onClick={() => void copy()}>
        Skopiuj informacje o urządzeniu
      </button>
      {copied === true && <p className="success">Skopiowano - wklej je w wiadomości.</p>}
      {copied === false && <pre className="help-diagnostics">{diagnostics()}</pre>}
    </div>
  )
}
