import { LANGUAGES, t } from '../lib/i18n'
import { LANGUAGE_NAMES } from './LanguageSwitch'
import type { PrefsApi } from '../hooks/usePrefs'
import { GAP_OPTIONS, UPCOMING_OPTIONS, suggestAlias, type TextSize } from '../lib/prefs'
import { ChoiceSetting, SwitchSetting } from './SettingControls'

interface Props {
  prefsApi: PrefsApi
  signedIn: boolean
}

const TEXT_SIZES = (): { value: TextSize; label: string }[] => ([
  { value: 'small', label: t('Mały') },
  { value: 'normal', label: t('Normalny') },
  { value: 'large', label: t('Duży') },
])

function SyncNote({ signedIn }: { signedIn: boolean }) {
  return (
    <p className="hint">
      {signedIn
        ? t('Ustawienia zapisują się na koncie - te same na telefonie i komputerze.')
        : t('Ustawienia zapisują się w tej przeglądarce. Po zalogowaniu będą na każdym urządzeniu.')}
    </p>
  )
}

export function AppearancePanel({ prefsApi, signedIn }: Props) {
  const { prefs, update } = prefsApi
  return (
    <div className="panel" id="settings-appearance">
      <h3 className="panel-title">{t('Wygląd')}</h3>
      <SyncNote signedIn={signedIn} />
      {/* Etykieta w obu językach - łatwo znaleźć, nawet gdy nie rozumiesz obecnego. */}
      <ChoiceSetting
        label="Język / Language"
        hint={t('Nazwy przedmiotów zostają jak w USOS - możesz je skrócić niżej.')}
        value={prefs.language}
        options={LANGUAGES.map((lang) => ({ value: lang, label: LANGUAGE_NAMES[lang] }))}
        onChange={(language) => update({ language })}
      />
      <ChoiceSetting
        label={t('Motyw')}
        value={prefs.theme}
        options={[
          { value: 'system', label: t('Jak system') },
          { value: 'light', label: t('Jasny') },
          { value: 'dark', label: t('Ciemny') },
        ]}
        onChange={(theme) => update({ theme })}
      />
      <ChoiceSetting
        label={t('Animacje')}
        hint={t('„Jak system” wyłącza je, gdy system prosi o ograniczenie ruchu.')}
        value={prefs.animations}
        options={[
          { value: 'on', label: t('Włączone') },
          { value: 'off', label: t('Wyłączone') },
          { value: 'system', label: t('Jak system') },
        ]}
        onChange={(animations) => update({ animations })}
      />
      <ChoiceSetting
        label={t('Rozmiar tekstu – telefon')}
        hint={prefsApi.isPhone ? t('To urządzenie korzysta z tego ustawienia.') : undefined}
        value={prefs.textSizePhone}
        options={TEXT_SIZES()}
        onChange={(textSizePhone) => update({ textSizePhone })}
      />
      <ChoiceSetting
        label={t('Rozmiar tekstu – komputer')}
        hint={prefsApi.isPhone ? undefined : t('To urządzenie korzysta z tego ustawienia.')}
        value={prefs.textSizeDesktop}
        options={TEXT_SIZES()}
        onChange={(textSizeDesktop) => update({ textSizeDesktop })}
      />
      <SwitchSetting
        label={t('Widok kompaktowy')}
        hint={t('Mniejsze odstępy - więcej zajęć mieści się na ekranie.')}
        checked={prefs.compact}
        onChange={(compact) => update({ compact })}
      />
      <ChoiceSetting
        label={t('Widok na start')}
        value={prefs.startView}
        options={[
          { value: 'today', label: t('Dziś') },
          { value: 'week', label: t('Tydzień') },
          { value: 'courses', label: t('Przedmioty') },
        ]}
        onChange={(startView) => update({ startView })}
      />
    </div>
  )
}

export function PlanPrefsPanel({ prefsApi }: Pick<Props, 'prefsApi'>) {
  const { prefs, update } = prefsApi
  return (
    <div className="panel" id="settings-plan">
      <h3 className="panel-title">{t('Plan i terminy')}</h3>
      <SwitchSetting
        label={t('Numer tygodnia semestru')}
        hint={t('Np. „tydzień 3 · nieparzysty”. Liczone z planu - tygodnie bez zajęć (np. święta) się nie liczą.')}
        checked={prefs.showWeekNumber}
        onChange={(showWeekNumber) => update({ showWeekNumber })}
      />
      <ChoiceSetting
        label={t('Okienko od')}
        hint={t('Krótsza przerwa to zwykłe przejście między salami.')}
        value={prefs.gapMinutes}
        options={GAP_OPTIONS.map((m) => ({ value: m, label: `${m} min` }))}
        onChange={(gapMinutes) => update({ gapMinutes })}
      />
      <SwitchSetting
        label={t('Zawsze pokazuj weekend')}
        hint={t('W siatce tygodnia także sobota i niedziela, nawet bez zajęć.')}
        checked={prefs.alwaysWeekend}
        onChange={(alwaysWeekend) => update({ alwaysWeekend })}
      />
      <ChoiceSetting
        label={t('Nadchodzące terminy w „Dziś”')}
        value={prefs.upcomingDays}
        options={UPCOMING_OPTIONS.map((d) => ({ value: d, label: t('{n} dni', { n: d }) }))}
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
    <div className="panel" id="settings-aliases">
      <h3 className="panel-title">{t('Skróty nazw przedmiotów')}</h3>
      <p className="hint">{t('Skrót zastępuje długą nazwę w planie. Puste pole = pełna nazwa.')}</p>
      <SwitchSetting
        label={t('Pokazuj skróty')}
        hint={t('Wyłączone = wszędzie pełne nazwy. Wpisane skróty zostają zapisane.')}
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
                placeholder={suggestion !== name ? t('np. {suggestion}', { suggestion }) : t('skrót')}
                onChange={(e) => setAlias(name, e.target.value)}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
