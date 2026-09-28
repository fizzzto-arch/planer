import type { PrefsApi } from '../hooks/usePrefs'
import { GAP_OPTIONS, UPCOMING_OPTIONS, suggestAlias, type TextSize } from '../lib/prefs'
import { ChoiceSetting, SwitchSetting } from './SettingControls'

interface Props {
  prefsApi: PrefsApi
  signedIn: boolean
}

const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: 'small', label: 'Mały' },
  { value: 'normal', label: 'Normalny' },
  { value: 'large', label: 'Duży' },
]

function SyncNote({ signedIn }: { signedIn: boolean }) {
  return (
    <p className="hint">
      {signedIn
        ? 'Ustawienia zapisują się na koncie - te same na telefonie i komputerze.'
        : 'Ustawienia zapisują się w tej przeglądarce. Po zalogowaniu będą na każdym urządzeniu.'}
    </p>
  )
}

export function AppearancePanel({ prefsApi, signedIn }: Props) {
  const { prefs, update } = prefsApi
  return (
    <div className="panel">
      <h3 className="panel-title">Wygląd</h3>
      <SyncNote signedIn={signedIn} />
      <ChoiceSetting
        label="Motyw"
        value={prefs.theme}
        options={[
          { value: 'system', label: 'Jak system' },
          { value: 'light', label: 'Jasny' },
          { value: 'dark', label: 'Ciemny' },
        ]}
        onChange={(theme) => update({ theme })}
      />
      <ChoiceSetting
        label="Animacje"
        hint="„Jak system” wyłącza je, gdy system prosi o ograniczenie ruchu."
        value={prefs.animations}
        options={[
          { value: 'on', label: 'Włączone' },
          { value: 'off', label: 'Wyłączone' },
          { value: 'system', label: 'Jak system' },
        ]}
        onChange={(animations) => update({ animations })}
      />
      <ChoiceSetting
        label="Rozmiar tekstu – telefon"
        hint={prefsApi.isPhone ? 'To urządzenie korzysta z tego ustawienia.' : undefined}
        value={prefs.textSizePhone}
        options={TEXT_SIZES}
        onChange={(textSizePhone) => update({ textSizePhone })}
      />
      <ChoiceSetting
        label="Rozmiar tekstu – komputer"
        hint={prefsApi.isPhone ? undefined : 'To urządzenie korzysta z tego ustawienia.'}
        value={prefs.textSizeDesktop}
        options={TEXT_SIZES}
        onChange={(textSizeDesktop) => update({ textSizeDesktop })}
      />
      <SwitchSetting
        label="Widok kompaktowy"
        hint="Mniejsze odstępy - więcej zajęć mieści się na ekranie."
        checked={prefs.compact}
        onChange={(compact) => update({ compact })}
      />
      <ChoiceSetting
        label="Widok na start"
        value={prefs.startView}
        options={[
          { value: 'today', label: 'Dziś' },
          { value: 'week', label: 'Tydzień' },
          { value: 'courses', label: 'Przedmioty' },
        ]}
        onChange={(startView) => update({ startView })}
      />
    </div>
  )
}

export function PlanPrefsPanel({ prefsApi }: Pick<Props, 'prefsApi'>) {
  const { prefs, update } = prefsApi
  return (
    <div className="panel">
      <h3 className="panel-title">Plan i terminy</h3>
      <SwitchSetting
        label="Numer tygodnia semestru"
        hint="Np. „tydzień 3 · nieparzysty”. Liczone z planu - tygodnie bez zajęć (np. święta) się nie liczą."
        checked={prefs.showWeekNumber}
        onChange={(showWeekNumber) => update({ showWeekNumber })}
      />
      <ChoiceSetting
        label="Okienko od"
        hint="Krótsza przerwa to zwykłe przejście między salami."
        value={prefs.gapMinutes}
        options={GAP_OPTIONS.map((m) => ({ value: m, label: `${m} min` }))}
        onChange={(gapMinutes) => update({ gapMinutes })}
      />
      <SwitchSetting
        label="Zawsze pokazuj weekend"
        hint="W siatce tygodnia także sobota i niedziela, nawet bez zajęć."
        checked={prefs.alwaysWeekend}
        onChange={(alwaysWeekend) => update({ alwaysWeekend })}
      />
      <ChoiceSetting
        label="Nadchodzące terminy w „Dziś”"
        value={prefs.upcomingDays}
        options={UPCOMING_OPTIONS.map((d) => ({ value: d, label: `${d} dni` }))}
        onChange={(upcomingDays) => update({ upcomingDays })}
      />
    </div>
  )
}

export function AliasesPanel({ prefsApi, courseNames }: Pick<Props, 'prefsApi'> & { courseNames: string[] }) {
  const { prefs, update } = prefsApi

  function setAlias(courseName: string, alias: string) {
    const next = { ...prefs.courseAliases }
    if (alias.trim()) next[courseName] = alias
    else delete next[courseName]
    update({ courseAliases: next })
  }

  return (
    <div className="panel">
      <h3 className="panel-title">Skróty nazw przedmiotów</h3>
      <p className="hint">Skrót zastępuje długą nazwę w planie. Puste pole = pełna nazwa.</p>
      <SwitchSetting
        label="Pokazuj skróty"
        hint="Wyłączone = wszędzie pełne nazwy. Wpisane skróty zostają zapisane."
        checked={prefs.useAliases}
        onChange={(useAliases) => update({ useAliases })}
      />
      <ul className={`alias-list${prefs.useAliases ? '' : ' is-disabled'}`}>
        {courseNames.map((name) => {
          const suggestion = suggestAlias(name)
          return (
            <li key={name} className="alias-row">
              <label className="alias-name" htmlFor={`alias-${name}`}>
                {name}
              </label>
              <input
                id={`alias-${name}`}
                className="text-input alias-input"
                value={prefs.courseAliases[name] ?? ''}
                maxLength={40}
                placeholder={suggestion !== name ? `np. ${suggestion}` : 'skrót'}
                onChange={(e) => setAlias(name, e.target.value)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
