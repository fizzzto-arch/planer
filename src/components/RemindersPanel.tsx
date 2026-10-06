import { t, tk } from '../lib/i18n'
import { useEffect, useState } from 'react'
import type { ExtrasApi } from '../hooks/useExtras'
import type { PrefsApi } from '../hooks/usePrefs'
import { errorMessage } from '../lib/errors'
import { currentSubscription, deviceId, deviceLabel, pushSupport, subscribe } from '../lib/push'
import { REMINDER_KINDS, type ReminderKind } from '../lib/reminders'
import { SwitchSetting } from './SettingControls'

interface Props {
  extras: ExtrasApi | null // null = niezalogowany
  prefsApi: PrefsApi
}

type Status = { ok: boolean; text: string } | null

// Przypomnienia o terminach: powiadomienia na tym urządzeniu + kiedy przypominać (na koncie).
export function RemindersPanel({ extras, prefsApi }: Props) {
  const { prefs, update } = prefsApi
  const [support] = useState(pushSupport)
  const [deviceOn, setDeviceOn] = useState<boolean | null>(null) // null = jeszcze sprawdzamy
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  // Czy to urządzenie ma już subskrypcję. Przy okazji odświeżamy jej zapis na koncie
  // (adres subskrypcji potrafi się zmienić, a dokument mógł zostać usunięty).
  const savePushDevice = extras?.savePushDevice
  useEffect(() => {
    if (support !== 'ok') return
    let cancelled = false
    currentSubscription()
      .then(async (sub) => {
        if (cancelled) return
        setDeviceOn(sub !== null && Notification.permission === 'granted')
        if (sub && savePushDevice) savePushDevice(await deviceId(sub), sub.toJSON(), deviceLabel())
      })
      .catch(() => !cancelled && setDeviceOn(false))
    return () => {
      cancelled = true
    }
  }, [support, savePushDevice])

  async function run(task: () => Promise<Status>) {
    setBusy(true)
    setStatus(null)
    try {
      setStatus(await task())
    } catch (e) {
      setStatus({
        ok: false,
        text:
          e instanceof Error && e.message === 'denied'
            ? t('Powiadomienia są zablokowane. Na iPhonie: Ustawienia → Powiadomienia → Planer; na komputerze: ikona kłódki obok adresu.')
            : errorMessage(e),
      })
    } finally {
      setBusy(false)
    }
  }

  const enable = () =>
    run(async () => {
      const sub = await subscribe()
      extras?.savePushDevice(await deviceId(sub), sub.toJSON(), deviceLabel())
      setDeviceOn(true)
      // Od razu widać, że powiadomienia się pokazują.
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification('Planer', { body: t('Przypomnienia o terminach są włączone.'), tag: 'planer-on' })
      return { ok: true, text: t('Włączone na tym urządzeniu.') }
    })

  const disable = () =>
    run(async () => {
      const sub = await currentSubscription()
      if (sub) {
        const id = await deviceId(sub)
        await sub.unsubscribe()
        extras?.deletePushDevice(id)
      }
      setDeviceOn(false)
      return { ok: true, text: t('Wyłączone na tym urządzeniu.') }
    })

  const test = () =>
    run(async () => {
      const sub = await currentSubscription()
      if (!sub) throw new Error(t('To urządzenie nie ma włączonych powiadomień.'))
      extras?.savePushDevice(await deviceId(sub), sub.toJSON(), deviceLabel(), true)
      return {
        ok: true,
        text: t('Wysłane do serwera. Próbne powiadomienie przyjdzie w ciągu ok. 15 minut - tak często serwer sprawdza terminy.'),
      }
    })

  const toggleKind = (kind: ReminderKind, on: boolean) =>
    update({ reminders: REMINDER_KINDS.map((k) => k.id).filter((id) => (id === kind ? on : prefs.reminders.includes(id))) })

  return (
    <div className="panel" id="settings-reminders">
      <h3 className="panel-title">{t('Przypomnienia o terminach')}</h3>
      {!extras ? (
        <p className="muted">{t('Zaloguj się, żeby dostawać przypomnienia o kolokwiach i terminach.')}</p>
      ) : (
        <>
          <p className="hint">
            {t('Powiadomienie o kolokwium, egzaminie albo projekcie z listy terminów - także przy zamkniętym Planerze. Serwer sprawdza terminy co ok. 15 minut, więc przypomnienie może przyjść z lekkim opóźnieniem.')}
          </p>

          <div className="reminder-device">
            {support === 'ios-browser' ? (
              <p className="muted">
                {t('Na iPhonie powiadomienia działają tylko w Planerze dodanym do ekranu początkowego (Udostępnij → Do ekranu początkowego). Otwórz go stamtąd i włącz przypomnienia.')}
              </p>
            ) : support === 'unsupported' ? (
              <p className="muted">{t('Ta przeglądarka nie obsługuje powiadomień.')}</p>
            ) : deviceOn ? (
              <>
                <span className="reminder-state is-on">{t('Włączone na tym urządzeniu')}</span>
                <span className="reminder-actions">
                  <button type="button" className="button small secondary" disabled={busy} onClick={() => void test()}>
                    {t('Wyślij próbne')}
                  </button>
                  <button type="button" className="button small secondary" disabled={busy} onClick={() => void disable()}>
                    {t('Wyłącz')}
                  </button>
                </span>
              </>
            ) : (
              <>
                <span className="reminder-state">{t('Wyłączone na tym urządzeniu')}</span>
                <button
                  type="button"
                  className="button small"
                  disabled={busy || deviceOn === null}
                  onClick={() => void enable()}
                >
                  {t('Włącz powiadomienia')}
                </button>
              </>
            )}
          </div>
          {status && <p className={status.ok ? 'hint' : 'error'}>{status.text}</p>}

          <h4 className="material-heading">{t('Plan zajęć')}</h4>
          <SwitchSetting
            label={t('Zmiany w planie z USOS')}
            hint={t('Przeniesione lub odwołane zajęcia, zmiana sali - sprawdzane co ok. 2 godziny.')}
            checked={prefs.planChanges}
            onChange={(planChanges) => update({ planChanges })}
          />
          <SwitchSetting
            label={t('Plan dnia rano')}
            hint={t('O 7:00: ile zajęć, od której do której i gdzie pierwsze.')}
            checked={prefs.morningSummary}
            onChange={(morningSummary) => update({ morningSummary })}
          />
          <SwitchSetting
            label={t('Przed pierwszymi zajęciami')}
            hint={t('Ok. 30 minut wcześniej, z salą.')}
            checked={prefs.beforeFirstClass}
            onChange={(beforeFirstClass) => update({ beforeFirstClass })}
          />
          <p className="hint">
            {t('Działa z planem dodanym linkiem z USOSweb (nie z pliku). Uwzględnia plan z USOS, bez Twoich ręcznych zmian.')}
          </p>

          <h4 className="material-heading">{t('Kiedy przypominać o terminach')}</h4>
          {REMINDER_KINDS.map((k) => (
            <SwitchSetting
              key={k.id}
              label={tk(k.label)}
              hint={tk(k.hint)}
              checked={prefs.reminders.includes(k.id)}
              onChange={(on) => toggleKind(k.id, on)}
            />
          ))}
          <p className="hint">{t('Te ustawienia są wspólne dla wszystkich Twoich urządzeń z włączonymi powiadomieniami.')}</p>
        </>
      )}
    </div>
  )
}
