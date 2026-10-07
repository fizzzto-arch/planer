// Wysyła przypomnienia o terminach (Web Push). Uruchamia go co 15 minut GitHub Actions
// (.github/workflows/reminders.yml) ze strefą czasową TZ=Europe/Warsaw.
//
// Sekrety repozytorium (Settings → Secrets and variables → Actions):
//   FIREBASE_SERVICE_ACCOUNT - klucz konta usługi Firebase (cały plik JSON),
//   VAPID_PRIVATE_KEY - prywatny klucz powiadomień (publiczny jest w src/lib/pushConfig.ts).
import { createHash } from 'node:crypto'
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
import { isAutoReport } from '../src/lib/feedback.ts'
import { NOTIFICATION_KEEP_DAYS, type NotificationKind } from '../src/lib/notifications.ts'
import { USOSWEB_PERSON_URL, isPersonId, parsePersonPage } from '../src/lib/usosPeople.ts'
import { translate, type Language } from '../src/lib/i18n.ts'
import { dueReminders, parseReminderDeadline, parseReminderKinds, reminderText } from '../src/lib/reminders.ts'
import { parseUsosCalendar } from '../src/lib/usos.ts'
import { isHiddenUsosClass, parseHiddenClasses } from '../src/lib/hiddenClasses.ts'

// Język powiadomień: z ustawień odbiorcy (brak = polski, jak przed wersją angielską).
function userLanguage(prefs: DocumentData): Language {
  return prefs.language === 'en' ? 'en' : 'pl'
}

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
  kind?: NotificationKind // do historii w Planerze; bez rodzaju (np. próbne) - tylko powiadomienie
  details?: string[] // pełna treść do historii (np. wszystkie zmiany w planie)
}

// Historia powiadomień w Planerze (users/{uid}/notifications) - zapis raz na osobę, nie na urządzenie.
async function remember(uid: string, notice: Notice) {
  if (!notice.kind) return
  await db.collection(`users/${uid}/notifications`).add({
    kind: notice.kind,
    title: notice.title,
    body: notice.body,
    details: notice.details ?? [],
    createdAt: FieldValue.serverTimestamp(),
  })
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
  const lang = userLanguage(prefs)
  const aliases = (prefs.useAliases !== false && typeof prefs.courseAliases === 'object' ? prefs.courseAliases : {}) as Record<
    string,
    unknown
  >
  const courseLabel = (name: string) => (typeof aliases[name] === 'string' ? (aliases[name] as string) : name)

  // Tylko terminy od dziś do 8 dni naprzód - najdalsze przypomnienie jest tydzień wcześniej.
  // Czytanie wszystkich (także sprzed miesięcy) co kwadrans zjadałoby darmowy limit odczytów.
  const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const inEightDays = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8)
  const deadlineDocs = await db
    .collection(`users/${uid}/deadlines`)
    .where('date', '>=', dayKey(now))
    .where('date', '<=', dayKey(inEightDays))
    .get()
  const deadlines = deadlineDocs.docs.flatMap((doc) => {
    const deadline = parseReminderDeadline(doc.id, doc.data())
    const updatedAt = doc.get('updatedAt')
    return deadline ? [{ deadline, updatedAt: updatedAt?.toDate ? (updatedAt.toDate() as Date) : null }] : []
  })

  const notices: Notice[] = []
  for (const reminder of dueReminders(deadlines, kinds, now, LOOKBACK_MS)) {
    const key = `${uid}_${reminder.deadline.id}_${reminder.kind}_${reminder.at.getTime()}`
    if (!(await firstTime(key, uid))) continue
    notices.push({ ...reminderText(reminder, courseLabel, lang), tag: `${reminder.deadline.id}-${reminder.kind}`, kind: 'deadline' })
  }
  notices.push(...(await planNotices(uid, prefs, courseLabel, lang)))
  for (const notice of notices) await remember(uid, notice)

  // Raz na godzinę: historia starsza niż NOTIFICATION_KEEP_DAYS znika.
  if (now.getMinutes() < 15) {
    const cutoff = new Date(now.getTime() - NOTIFICATION_KEEP_DAYS * 24 * 60 * 60 * 1000)
    const old = await db.collection(`users/${uid}/notifications`).where('createdAt', '<', cutoff).get()
    for (const doc of old.docs) await doc.ref.delete()
  }

  for (const device of userDevices) {
    const data = device.data()
    const deviceNotices = [...notices]
    if (data.testRequested === true) {
      deviceNotices.push({ title: 'Planer', body: translate(lang, 'Próbne powiadomienie - przypomnienia działają.'), tag: 'planer-test' })
      await device.ref.update({ testRequested: false })
    }
    for (const notice of deviceNotices) {
      const ok = await send(device.ref, data, notice)
      if (ok === 'gone') break
    }
  }
}

// Powiadomienia dla administratorów (na ich urządzenia z przypomnieniami).
let adminUidsCache: string[] | null = null
async function notifyAdmins(notice: Notice) {
  adminUidsCache ??= (
    await Promise.all(ADMIN_EMAILS.map((email) => getAuth().getUserByEmail(email).then((u) => u.uid, () => null)))
  ).filter((uid): uid is string => uid !== null)
  for (const adminUid of adminUidsCache) {
    await remember(adminUid, notice)
    for (const device of byUser.get(adminUid) ?? []) await send(device.ref, device.data(), notice)
  }
}

// Nowe prośby o dostęp.
const pending = await db.collection('access').where('status', '==', 'pending').get()
for (const request of pending.docs) {
  if (!(await firstTime(`access_${request.id}`, request.id))) continue
  const email = String(request.get('email') ?? 'Ktoś')
  await notifyAdmins({
    title: 'Nowe konto czeka na zatwierdzenie',
    body: `${email} prosi o dostęp do Planera.`,
    tag: `access-${request.id}`,
    kind: 'access',
  })
}

// Nowe zgłoszenia od testerów (tylko dokończone - z wszystkimi załącznikami).
const newFeedback = await db.collection('feedback').where('status', '==', 'new').get()
for (const f of newFeedback.docs) {
  if (f.get('complete') !== true) continue
  if (!(await firstTime(`feedback_${f.id}`, String(f.get('uid') ?? '')))) continue
  const email = String(f.get('email') ?? 'testera')
  const text = [f.get('bad'), f.get('text'), f.get('missing'), f.get('good')].find((t) => typeof t === 'string' && t.trim())
  if (isAutoReport({ text: String(f.get('text') ?? '') })) {
    // Treść: "Automatyczne zgłoszenie błędu (widok)\nTypeError: ..." - w powiadomieniu sam komunikat.
    const message = String(f.get('text')).split('\n')[1] ?? ''
    await notifyAdmins({
      title: `Planer wywrócił się u ${email}`,
      body: message.slice(0, 140),
      tag: `feedback-${f.id}`,
      kind: 'feedback',
    })
    continue
  }
  const kind = f.get('kind') === 'bug' ? 'Błąd' : f.get('kind') === 'idea' ? 'Pomysł' : 'Opinia'
  await notifyAdmins({
    title: `${kind} od ${email}`,
    body: String(text ?? '').slice(0, 140) || 'Nowe zgłoszenie w Planerze.',
    tag: `feedback-${f.id}`,
    kind: 'feedback',
  })
}

// Odpowiedź administratora na zgłoszenie - powiadomienie dla autora (raz na każdą treść odpowiedzi).
// Tylko odpowiedzi z ostatnich godzin (replyAt zapisuje Planer przy odpowiedzi) - nie wszystkie co kwadrans.
const replied = await db
  .collection('feedback')
  .where('replyAt', '>=', new Date(now.getTime() - LOOKBACK_MS))
  .get()
for (const f of replied.docs) {
  const uid = String(f.get('uid') ?? '')
  const reply = String(f.get('reply') ?? '')
  if (!reply.trim()) continue // odpowiedź usunięta - nie ma o czym powiadamiać
  if (!uid || !(await firstTime(`reply_${f.id}_${createHash('sha1').update(reply).digest('hex').slice(0, 10)}`, uid))) {
    continue
  }
  // Do historii zawsze (cała odpowiedź), na telefon - jeśli autor ma włączone powiadomienia.
  const prefs = (await db.doc(`users/${uid}/settings/prefs`).get()).data() ?? {}
  const notice: Notice = {
    title: translate(userLanguage(prefs), 'Odpowiedź na Twoje zgłoszenie'),
    body: reply.slice(0, 140),
    tag: `reply-${f.id}`,
    kind: 'reply',
    details: reply.length > 140 ? [reply] : [],
  }
  await remember(uid, notice)
  for (const device of byUser.get(uid) ?? []) await send(device.ref, device.data(), notice)
}

// Tytuły prowadzących: Planer zgłasza osoby bez tytułu (people/{id}, pending), a my czytamy ich
// publiczne strony w USOSweb (API USOS podaje tytuły tylko zarejestrowanym aplikacjom).
const PEOPLE_MAX_ATTEMPTS = 5 // potem odpuszczamy (np. usunięty profil) - bez ostrzeżeń co kwadrans
const PEOPLE_REFRESH_MS = 180 * 24 * 60 * 60 * 1000 // stopnie się zmieniają (habilitacja, profesura)
const pendingPeople = (await db.collection('people').where('pending', '==', true).limit(30).get()).docs
// Raz na dobę (ok. 3:00) także kilka najstarszych - odświeżenie tytułów sprzed pół roku.
if (now.getHours() === 3 && now.getMinutes() < 15) {
  const stale = await db
    .collection('people')
    .where('fetchedAt', '<', new Date(now.getTime() - PEOPLE_REFRESH_MS))
    .limit(10)
    .get()
  pendingPeople.push(...stale.docs)
}
for (const person of pendingPeople) {
  if (!isPersonId(person.id)) {
    await person.ref.delete()
    continue
  }
  try {
    const response = await fetch(`${USOSWEB_PERSON_URL}${person.id}`, { signal: AbortSignal.timeout(20_000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const info = parsePersonPage(await response.text())
    await person.ref.set({ ...info, pending: false, attempts: 0, fetchedAt: FieldValue.serverTimestamp() }, { merge: true })
  } catch (e) {
    const attempts = Number(person.get('attempts') ?? 0) + 1
    const giveUp = attempts >= PEOPLE_MAX_ATTEMPTS
    await person.ref.set(
      giveUp ? { pending: false, attempts, fetchedAt: FieldValue.serverTimestamp() } : { attempts },
      { merge: true },
    )
    if (giveUp) console.log(`::warning::Strona osoby ${person.id} nie odpowiada (${(e as Error).message}) - odpuszczam.`)
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
async function planNotices(
  uid: string,
  prefs: DocumentData,
  label: (course: string) => string,
  lang: Language,
): Promise<Notice[]> {
  const wantChanges = prefs.planChanges !== false
  const wantMorning = prefs.morningSummary === true
  const wantFirst = prefs.beforeFirstClass === true
  if (!wantChanges && !wantMorning && !wantFirst) return []

  // Zajęcia usunięte przez użytkownika z planu - bez powiadomień o nich (zapamiętany plan zostaje pełny,
  // żeby po przywróceniu nie wyglądały na nowe).
  const hidden = parseHiddenClasses(prefs.hiddenClasses)
  const visible = (list: WatchedMeeting[]) => list.filter((m) => !isHiddenUsosClass(hidden, m.course, m.type))

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
            const changes = diffPlans(visible(plan), visible(next), now, watch.until)
            if (changes.length > 0) notices.push({ ...changesText(changes, label, lang), tag: `plan-${now.getTime()}`, kind: 'plan' })
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

  const today = classesOn(visible(plan), now)
  if (today.length === 0) return notices
  const dateKey = now.toDateString().replace(/\s+/g, '-')
  const last = today.reduce((a, b) => (b.end > a.end ? b : a))
  // Plan dnia: między 7 a 10, póki zajęcia jeszcze trwają.
  if (wantMorning && now.getHours() >= 7 && now.getHours() < 10 && now.getTime() < last.end) {
    if (await firstTime(`morning_${uid}_${dateKey}`, uid)) {
      notices.push({ ...daySummaryText(today, label, lang), tag: `day-${dateKey}`, kind: 'day' })
    }
  }
  const first = today[0]
  const left = first.start - now.getTime()
  if (wantFirst && left > 0 && left <= FIRST_CLASS_WINDOW_MS && (await firstTime(`first_${uid}_${first.id}`, uid))) {
    notices.push({ ...firstClassText(first, label, now, lang), tag: `first-${first.id}`, kind: 'first' })
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
      // Do telefonu tylko to, co pokazuje powiadomienie (limit rozmiaru) - szczegóły są w historii.
      JSON.stringify({ title: notice.title, body: notice.body, tag: notice.tag, url: './' }),
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
