// Wysyła przypomnienia o terminach (Web Push). Uruchamia go co 15 minut GitHub Actions
// (.github/workflows/reminders.yml) ze strefą czasową TZ=Europe/Warsaw.
//
// Sekrety repozytorium (Settings → Secrets and variables → Actions):
//   FIREBASE_SERVICE_ACCOUNT - klucz konta usługi Firebase (cały plik JSON),
//   VAPID_PRIVATE_KEY - prywatny klucz powiadomień (publiczny jest w src/lib/pushConfig.ts).
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, type DocumentData, type DocumentReference } from 'firebase-admin/firestore'
import webpush from 'web-push'
import { ADMIN_EMAILS } from '../src/lib/firebaseConfig.ts'
import { VAPID_PUBLIC_KEY, VAPID_SUBJECT } from '../src/lib/pushConfig.ts'
import {
  WATCH_DAYS,
  changesText,
  classesOn,
  daySummaryText,
  diffPlans,
  firstClassText,
  looksBroken,
  snapshotPlan,
  type WatchedMeeting,
} from '../src/lib/planWatch.ts'
import { dueReminders, parseReminderDeadline, parseReminderKinds, reminderText } from '../src/lib/reminders.ts'
import { parseUsosCalendar } from '../src/lib/usos.ts'

// Przypomnienie spóźnione o więcej (skrypt pominięty, awaria) już się nie wysyła.
const LOOKBACK_MS = 6 * 60 * 60 * 1000
// Jak długo usługa push ma próbować dostarczyć powiadomienie wyłączonemu telefonowi.
const TTL_SECONDS = 12 * 60 * 60
// Co ile pobieramy plan z USOS (zmiany w planie, plan dnia).
const WATCH_EVERY_MS = 2 * 60 * 60 * 1000
// Przypomnienie przed pierwszymi zajęciami: gdy zostało najwyżej tyle.
const FIRST_CLASS_WINDOW_MS = 35 * 60 * 1000

interface Notice {
  title: string
  body: string
  tag: string
}

// trim(): przypadkowa spacja albo Enter przy wklejaniu sekretu nie psuje klucza.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY?.trim()
if (!serviceAccount || !vapidPrivateKey) {
  // Bez sekretów kończymy "na zielono" - inaczej GitHub co kwadrans wysyłałby maila o błędzie.
  console.log('::warning::Brak sekretów FIREBASE_SERVICE_ACCOUNT / VAPID_PRIVATE_KEY - przypomnienia wyłączone.')
  process.exit(0)
}

initializeApp({ credential: cert(JSON.parse(serviceAccount)) })
const db = getFirestore()
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, vapidPrivateKey)

const now = new Date()
let sent = 0
let removed = 0

// Urządzenia z włączonymi przypomnieniami, pogrupowane według użytkownika.
const devices = await db.collectionGroup('push').get()
const byUser = new Map<string, typeof devices.docs>()
for (const device of devices.docs) {
  const uid = device.ref.parent.parent?.id
  if (!uid) continue
  byUser.set(uid, [...(byUser.get(uid) ?? []), device])
}

for (const [uid, userDevices] of byUser) {
  const prefs = (await db.doc(`users/${uid}/settings/prefs`).get()).data() ?? {}
  const kinds = parseReminderKinds(prefs.reminders)
  const aliases = (prefs.useAliases !== false && typeof prefs.courseAliases === 'object' ? prefs.courseAliases : {}) as Record<
    string,
    unknown
  >
  const courseLabel = (name: string) => (typeof aliases[name] === 'string' ? (aliases[name] as string) : name)

  const deadlines = (await db.collection(`users/${uid}/deadlines`).get()).docs.flatMap((doc) => {
    const deadline = parseReminderDeadline(doc.id, doc.data())
    const updatedAt = doc.get('updatedAt')
    return deadline ? [{ deadline, updatedAt: updatedAt?.toDate ? (updatedAt.toDate() as Date) : null }] : []
  })

  const notices: Notice[] = []
  for (const reminder of dueReminders(deadlines, kinds, now, LOOKBACK_MS)) {
    const key = `${uid}_${reminder.deadline.id}_${reminder.kind}_${reminder.at.getTime()}`
    if (!(await firstTime(key, uid))) continue
    notices.push({ ...reminderText(reminder, courseLabel), tag: `${reminder.deadline.id}-${reminder.kind}` })
  }
  notices.push(...(await planNotices(uid, prefs, courseLabel)))

  for (const device of userDevices) {
    const data = device.data()
    const deviceNotices = [...notices]
    if (data.testRequested === true) {
      deviceNotices.push({ title: 'Planer', body: 'Próbne powiadomienie - przypomnienia działają.', tag: 'planer-test' })
      await device.ref.update({ testRequested: false })
    }
    for (const notice of deviceNotices) {
      const ok = await send(device.ref, data, notice)
      if (ok === 'gone') break
    }
  }
}

// Nowe prośby o dostęp - powiadomienie dla administratorów (na ich urządzenia z przypomnieniami).
const pending = await db.collection('access').where('status', '==', 'pending').get()
if (!pending.empty) {
  const adminUids = (
    await Promise.all(ADMIN_EMAILS.map((email) => getAuth().getUserByEmail(email).then((u) => u.uid, () => null)))
  ).filter((uid): uid is string => uid !== null)
  for (const request of pending.docs) {
    if (!(await firstTime(`access_${request.id}`, request.id))) continue
    const email = String(request.get('email') ?? 'Ktoś')
    for (const adminUid of adminUids) {
      for (const device of byUser.get(adminUid) ?? []) {
        await send(device.ref, device.data(), {
          title: 'Nowe konto czeka na zatwierdzenie',
          body: `${email} prosi o dostęp do Planera.`,
          tag: `access-${request.id}`,
        })
      }
    }
  }
}

// Zapamiętany plan trzymamy tylko u osób z włączonymi powiadomieniami - po wyłączeniu
// powiadomień albo usunięciu konta znika też z serwera.
for (const watch of (await db.collection('planWatch').listDocuments())) {
  if (!byUser.has(watch.id)) await watch.delete()
}

console.log(`Urządzenia: ${devices.size}, wysłane: ${sent}, usunięte nieaktualne: ${removed}`)

// Zmiany w planie z USOS, plan dnia rano i przypomnienie przed pierwszymi zajęciami.
// Plan pobieramy przez link użytkownika co WATCH_EVERY_MS i zapamiętujemy najbliższe tygodnie
// (planWatch/{uid} - tylko dla serwera, reguły nie wpuszczają tam strony).
async function planNotices(uid: string, prefs: DocumentData, label: (course: string) => string): Promise<Notice[]> {
  const wantChanges = prefs.planChanges !== false
  const wantMorning = prefs.morningSummary === true
  const wantFirst = prefs.beforeFirstClass === true
  if (!wantChanges && !wantMorning && !wantFirst) return []

  const ref = db.doc(`planWatch/${uid}`)
  const watch = (await ref.get()).data() as { plan?: WatchedMeeting[]; until?: number; checkedAt?: number } | undefined
  let plan = watch?.plan ?? null
  const notices: Notice[] = []

  if (!watch?.checkedAt || now.getTime() - watch.checkedAt >= WATCH_EVERY_MS) {
    const url = (await db.doc(`users/${uid}`).get()).get('icalUrl')
    if (typeof url === 'string' && url.startsWith('https://')) {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`USOS ${response.status}`)
        const next = snapshotPlan(parseUsosCalendar(await response.text()), now)
        // Niepełna odpowiedź USOS: nie porównujemy i nie nadpisujemy - spróbujemy za kwadrans.
        const broken = plan !== null && watch?.until !== undefined && looksBroken(plan, next, now, watch.until)
        if (!broken) {
          if (plan && watch?.until && wantChanges) {
            const changes = diffPlans(plan, next, now, watch.until)
            if (changes.length > 0) notices.push({ ...changesText(changes, label), tag: `plan-${now.getTime()}` })
          }
          plan = next
          await ref.set({ plan: next, until: now.getTime() + WATCH_DAYS * 24 * 60 * 60 * 1000, checkedAt: now.getTime() })
        }
      } catch (e) {
        console.log(`::warning::Nie udało się pobrać planu z USOS: ${(e as Error).message}`)
      }
    }
  }
  if (!plan) return notices

  const today = classesOn(plan, now)
  if (today.length === 0) return notices
  const dateKey = now.toDateString().replace(/\s+/g, '-')
  const last = today.reduce((a, b) => (b.end > a.end ? b : a))
  // Plan dnia: między 7 a 10, póki zajęcia jeszcze trwają.
  if (wantMorning && now.getHours() >= 7 && now.getHours() < 10 && now.getTime() < last.end) {
    if (await firstTime(`morning_${uid}_${dateKey}`, uid)) {
      notices.push({ ...daySummaryText(today, label), tag: `day-${dateKey}` })
    }
  }
  const first = today[0]
  const left = first.start - now.getTime()
  if (wantFirst && left > 0 && left <= FIRST_CLASS_WINDOW_MS && (await firstTime(`first_${uid}_${first.id}`, uid))) {
    notices.push({ ...firstClassText(first, label, now), tag: `first-${first.id}` })
  }
  return notices
}

// Dziennik wysłanych: create() nie nadpisuje, więc każde powiadomienie idzie najwyżej raz,
// nawet gdy dwa uruchomienia skryptu nałożą się na siebie.
async function firstTime(key: string, uid: string): Promise<boolean> {
  try {
    await db.doc(`reminderLog/${key}`).create({ uid, sentAt: FieldValue.serverTimestamp() })
    return true
  } catch (e) {
    if ((e as { code?: number }).code === 6) return false // ALREADY_EXISTS - już wysłane
    throw e
  }
}

async function send(ref: DocumentReference, data: DocumentData, notice: Notice) {
  try {
    await webpush.sendNotification(
      { endpoint: data.endpoint, keys: data.keys },
      JSON.stringify({ ...notice, url: './' }),
      { TTL: TTL_SECONDS },
    )
    sent++
    return 'sent'
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    // 404/410: subskrypcja wygasła (np. usunięta aplikacja) - sprzątamy urządzenie.
    if (status === 404 || status === 410) {
      await ref.delete()
      removed++
      return 'gone'
    }
    console.log(`::warning::Nie udało się wysłać (${status ?? 'błąd'}): ${(e as Error).message}`)
    return 'error'
  }
}
