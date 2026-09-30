import type { PrefsApi } from '../hooks/usePrefs'
import { SwitchSetting } from './SettingControls'

// Ustawienia wspólnych okienek: zgoda na udostępnianie godzin zajęć i nazwa widoczna dla znajomych.
export function SharingPanel({ prefsApi, email }: { prefsApi: PrefsApi; email: string | null }) {
  const { prefs, update } = prefsApi
  return (
    <div className="panel">
      <h3 className="panel-title">Wspólne okienka</h3>
      <SwitchSetting
        label="Pokazuj znajomym, kiedy mam zajęcia"
        hint="Tylko godziny zajęć na najbliższe 2 tygodnie - bez nazw przedmiotów, sal i grup. Widzą je wyłącznie osoby z Planera, które też to włączyły; Ty widzisz ich tak samo. Wyłączenie od razu usuwa Twoje godziny."
        checked={prefs.shareBusy}
        onChange={(shareBusy) => update({ shareBusy })}
      />
      {prefs.shareBusy && (
        <label className="field">
          <span className="field-label">Jak widzą Cię znajomi</span>
          <input
            className="text-input"
            maxLength={40}
            value={prefs.shareName}
            placeholder={email?.split('@')[0] ?? 'np. Mikołaj'}
            onChange={(e) => update({ shareName: e.target.value })}
          />
        </label>
      )}
      <p className="hint">Wspólne okienka znajdziesz w zakładce Tydzień.</p>
    </div>
  )
}
