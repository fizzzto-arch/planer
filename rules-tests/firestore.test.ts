// Reguły bazy (firestore.rules) na emulatorze Firestore: kto może czytać i zmieniać co.
// To jedyna prawdziwa ochrona danych - kod strony można obejść, reguł nie.
// Uruchomienie: npm run test:rules (sam startuje emulator; wymaga Javy).
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

const ADMIN = { uid: 'admin', email: 'fizzz.to@gmail.com' } // jak ADMIN_EMAILS w src/lib/firebaseConfig.ts
const ALICE = { uid: 'alice', email: 'alice@pw.edu.pl' } // zatwierdzona
const BOB = { uid: 'bob', email: 'bob@pw.edu.pl' } // zatwierdzony
const PENDING = { uid: 'pending', email: 'nowy@pw.edu.pl' } // czeka na zatwierdzenie
const UNVERIFIED = { uid: 'unverified', email: 'niepotwierdzony@pw.edu.pl' } // e-mail niepotwierdzony

type Who = { uid: string; email: string }
const as = (who: Who, verified = true): Firestore =>
  env.authenticatedContext(who.uid, { email: who.email, email_verified: verified }).firestore() as unknown as Firestore
const anon = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore

// Poprawne nowe zgłoszenie (jak w src/lib/cloud.ts: submitFeedback).
const feedback = (who: Who, over: Record<string, unknown> = {}) => ({
  uid: who.uid,
  email: who.email,
  kind: 'bug',
  good: '',
  bad: 'Nie działa eksport',
  missing: '',
  text: '',
  diagnostics: 'Planer test',
  status: 'new',
  reply: '',
  attachments: [],
  size: 0,
  complete: false,
  createdAt: serverTimestamp(),
  ...over,
})

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-planer',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env?.cleanup()
})

// Stan wyjściowy przed każdym testem, zapisany z pominięciem reguł.
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    for (const who of [ALICE, BOB]) {
      await setDoc(doc(db, 'access', who.uid), { email: who.email, status: 'approved', optimizer: false })
    }
    await setDoc(doc(db, 'access', PENDING.uid), { email: PENDING.email, status: 'pending' })
    await setDoc(doc(db, 'users', ALICE.uid), { icalUrl: 'https://apps.usos.pw.edu.pl/...key=tajne' })
    await setDoc(doc(db, 'users', ALICE.uid, 'deadlines', 'd1'), { title: 'Kolokwium' })
    await setDoc(doc(db, 'materials', 'm1'), { uploadedBy: ALICE.uid, name: 'wyklad.pdf', size: 10, chunkCount: 1, complete: true })
    await setDoc(doc(db, 'materials', 'm1', 'chunks', '0000'), { data: Bytes.fromUint8Array(new Uint8Array([1])) })
    await setDoc(doc(db, 'feedback', 'f1'), { ...feedback(ALICE), createdAt: new Date(), complete: false })
    await setDoc(doc(db, 'feedback', 'f1', 'chunks', '0-0000'), { data: Bytes.fromUint8Array(new Uint8Array([1])) })
    await setDoc(doc(db, 'reminderLog', 'x'), { uid: ALICE.uid })
    await setDoc(doc(db, 'planWatch', ALICE.uid), { meetings: [] })
  })
})

describe('prośby o dostęp (access)', () => {
  it('każdy widzi tylko swoją, administrator wszystkie', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), 'access', ALICE.uid)))
    await assertFails(getDoc(doc(as(ALICE), 'access', BOB.uid)))
    await assertFails(getDoc(doc(anon(), 'access', ALICE.uid)))
    await assertSucceeds(getDoc(doc(as(ADMIN), 'access', BOB.uid)))
    await assertSucceeds(getDocs(collection(as(ADMIN), 'access')))
    await assertFails(getDocs(collection(as(ALICE), 'access')))
  })

  it('nową prośbę zakłada się tylko dla siebie, jako "pending", z potwierdzonym e-mailem', async () => {
    const who = { uid: 'nowa', email: 'nowa@pw.edu.pl' }
    const ok = { email: who.email, status: 'pending', requestedAt: serverTimestamp() }
    await assertFails(setDoc(doc(as(who), 'access', who.uid), { ...ok, status: 'approved' }))
    await assertFails(setDoc(doc(as(who), 'access', who.uid), { ...ok, email: 'ktos@inny.pl' }))
    await assertFails(setDoc(doc(as(who), 'access', 'ktos-inny'), ok))
    await assertFails(setDoc(doc(as(UNVERIFIED, false), 'access', UNVERIFIED.uid), { ...ok, email: UNVERIFIED.email }))
    await assertSucceeds(setDoc(doc(as(who), 'access', who.uid), ok))
  })

  it('sam sobie nikt nie zatwierdzi konta ani nie przyzna optymalizatora - tylko administrator', async () => {
    await assertFails(updateDoc(doc(as(PENDING), 'access', PENDING.uid), { status: 'approved' }))
    await assertFails(updateDoc(doc(as(ALICE), 'access', ALICE.uid), { optimizer: true }))
    await assertFails(setDoc(doc(as(ALICE), 'access', ALICE.uid), { email: ALICE.email, status: 'approved', optimizer: true }))
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'access', PENDING.uid), { status: 'approved' }))
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'access', ALICE.uid), { optimizer: true }))
  })

  it('własną prośbę można usunąć (usuwanie konta), cudzej nie', async () => {
    await assertFails(deleteDoc(doc(as(BOB), 'access', ALICE.uid)))
    await assertSucceeds(deleteDoc(doc(as(ALICE), 'access', ALICE.uid)))
  })

  it('administrator tylko z właściwego adresu, i to bez względu na wielkość liter', async () => {
    const fake = { uid: 'fake', email: 'fizzz.to@gmail.com.pl' }
    await assertFails(getDocs(collection(as(fake), 'access')))
    const upper = { uid: 'admin2', email: 'FIZZZ.TO@gmail.com' }
    await assertSucceeds(getDocs(collection(as(upper), 'access')))
  })
})

describe('prywatne dane (users)', () => {
  it('właściciel czyta i zapisuje swoje', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), 'users', ALICE.uid)))
    await assertSucceeds(getDocs(collection(as(ALICE), 'users', ALICE.uid, 'deadlines')))
    await assertSucceeds(setDoc(doc(as(ALICE), 'users', ALICE.uid, 'deadlines', 'd2'), { title: 'Egzamin' }))
  })

  it('nikt inny - także administrator - nie widzi cudzego planu, linku ani terminów', async () => {
    for (const db of [as(BOB), as(ADMIN), anon()]) {
      await assertFails(getDoc(doc(db, 'users', ALICE.uid)))
      await assertFails(getDocs(collection(db, 'users', ALICE.uid, 'deadlines')))
      await assertFails(setDoc(doc(db, 'users', ALICE.uid, 'deadlines', 'd9'), { title: 'podrzucone' }))
    }
  })

  it('konto bez zatwierdzenia albo z niepotwierdzonym e-mailem nie zapisuje nawet swoich danych', async () => {
    await assertFails(setDoc(doc(as(PENDING), 'users', PENDING.uid, 'deadlines', 'd1'), { title: 'x' }))
    await assertFails(setDoc(doc(as(ALICE, false), 'users', ALICE.uid, 'deadlines', 'd3'), { title: 'x' }))
  })
})

describe('wspólne materiały (materials)', () => {
  it('czytają wszyscy z dostępem, bez dostępu nikt', async () => {
    await assertSucceeds(getDoc(doc(as(BOB), 'materials', 'm1')))
    await assertSucceeds(getDoc(doc(as(BOB), 'materials', 'm1', 'chunks', '0000')))
    await assertFails(getDoc(doc(as(PENDING), 'materials', 'm1')))
    await assertFails(getDoc(doc(anon(), 'materials', 'm1')))
  })

  it('wgrywa się tylko jako autor, z limitem rozmiaru', async () => {
    const ok = { uploadedBy: BOB.uid, name: 'notatki.pdf', size: 1000, chunkCount: 1, complete: false }
    await assertFails(setDoc(doc(as(BOB), 'materials', 'm2'), { ...ok, uploadedBy: ALICE.uid }))
    await assertFails(setDoc(doc(as(BOB), 'materials', 'm2'), { ...ok, size: 21 * 1024 * 1024 }))
    await assertFails(setDoc(doc(as(BOB), 'materials', 'm2'), { ...ok, chunkCount: 31 }))
    await assertSucceeds(setDoc(doc(as(BOB), 'materials', 'm2'), ok))
  })

  it('cudzego pliku nie zmienisz, nie usuniesz i nie dopiszesz mu kawałków', async () => {
    await assertFails(updateDoc(doc(as(BOB), 'materials', 'm1'), { complete: false }))
    await assertFails(deleteDoc(doc(as(BOB), 'materials', 'm1')))
    await assertFails(setDoc(doc(as(BOB), 'materials', 'm1', 'chunks', '0001'), { data: Bytes.fromUint8Array(new Uint8Array([2])) }))
    await assertFails(deleteDoc(doc(as(BOB), 'materials', 'm1', 'chunks', '0000')))
  })

  it('autor zmienia tylko "complete" i może usunąć swój plik', async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'materials', 'm1'), { name: 'inna nazwa.pdf' }))
    await assertSucceeds(updateDoc(doc(as(ALICE), 'materials', 'm1'), { complete: false }))
    await assertSucceeds(deleteDoc(doc(as(ALICE), 'materials', 'm1', 'chunks', '0000')))
    await assertSucceeds(deleteDoc(doc(as(ALICE), 'materials', 'm1')))
  })
})

describe('zgłoszenia (feedback)', () => {
  it('poprawne zgłoszenie przechodzi', async () => {
    await assertSucceeds(setDoc(doc(as(BOB), 'feedback', 'f2'), feedback(BOB)))
  })

  it('bez podszywania się i bez gotowego statusu czy odpowiedzi', async () => {
    const db = as(BOB)
    await assertFails(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { uid: ALICE.uid })))
    await assertFails(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { email: ALICE.email })))
    await assertFails(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { status: 'done' })))
    await assertFails(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { reply: 'Załatwione!' })))
    await assertFails(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { complete: true })))
    await assertFails(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { createdAt: new Date(2020, 0, 1) })))
    await assertFails(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { admin: true }))) // nieznane pole
    await assertFails(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { kind: 'spam' })))
  })

  it('limity: treść do 3000 znaków, do 4 załączników, razem do 40 MB', async () => {
    const db = as(BOB)
    await assertFails(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { bad: 'x'.repeat(3001) })))
    await assertFails(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { attachments: [1, 2, 3, 4, 5] })))
    await assertFails(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { size: 41943041 })))
    await assertSucceeds(setDoc(doc(db, 'feedback', 'f2'), feedback(BOB, { bad: 'x'.repeat(3000), size: 41943040 })))
  })

  it('bez zatwierdzonego konta nie da się nic zgłosić', async () => {
    await assertFails(setDoc(doc(as(PENDING), 'feedback', 'f2'), feedback(PENDING)))
    await assertFails(setDoc(doc(anon(), 'feedback', 'f2'), feedback(ALICE)))
  })

  it('autor widzi swoje, inni nie; administrator widzi wszystkie', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), 'feedback', 'f1')))
    await assertFails(getDoc(doc(as(BOB), 'feedback', 'f1')))
    await assertSucceeds(getDocs(query(collection(as(BOB), 'feedback'), where('uid', '==', BOB.uid))))
    await assertFails(getDocs(collection(as(BOB), 'feedback')))
    await assertSucceeds(getDocs(collection(as(ADMIN), 'feedback')))
    await assertSucceeds(getDoc(doc(as(ADMIN), 'feedback', 'f1', 'chunks', '0-0000')))
    await assertFails(getDoc(doc(as(BOB), 'feedback', 'f1', 'chunks', '0-0000')))
  })

  it('autor oznacza tylko koniec wysyłania; status i odpowiedź zmienia administrator', async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'feedback', 'f1'), { status: 'done' }))
    await assertFails(updateDoc(doc(as(ALICE), 'feedback', 'f1'), { reply: 'sam sobie' }))
    await assertFails(updateDoc(doc(as(BOB), 'feedback', 'f1'), { complete: true }))
    await assertSucceeds(updateDoc(doc(as(ALICE), 'feedback', 'f1'), { complete: true }))
    await assertSucceeds(updateDoc(doc(as(ADMIN), 'feedback', 'f1'), { status: 'done', reply: 'Poprawione' }))
  })

  it('załączniki dopisuje tylko autor, póki wysyłanie trwa, i do 900 kB na kawałek', async () => {
    const chunk = (n: number) => ({ data: Bytes.fromUint8Array(new Uint8Array(n)) })
    await assertFails(setDoc(doc(as(BOB), 'feedback', 'f1', 'chunks', '0-0001'), chunk(10)))
    await assertFails(setDoc(doc(as(ALICE), 'feedback', 'f1', 'chunks', '0-0001'), chunk(921601)))
    await assertSucceeds(setDoc(doc(as(ALICE), 'feedback', 'f1', 'chunks', '0-0001'), chunk(921600)))
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'feedback', 'f1'), { complete: true }))
    await assertFails(setDoc(doc(as(ALICE), 'feedback', 'f1', 'chunks', '0-0002'), chunk(10)))
  })

  it('usuwa autor (np. przy usuwaniu konta) albo administrator, nikt inny', async () => {
    await assertFails(deleteDoc(doc(as(BOB), 'feedback', 'f1')))
    await assertFails(deleteDoc(doc(as(BOB), 'feedback', 'f1', 'chunks', '0-0000')))
    await assertSucceeds(deleteDoc(doc(as(ALICE), 'feedback', 'f1', 'chunks', '0-0000')))
    await assertSucceeds(deleteDoc(doc(as(ALICE), 'feedback', 'f1')))
  })
})

describe('dane serwera przypomnień', () => {
  it('dziennik wysłanych i zapamiętany plan są niedostępne ze strony - nawet dla administratora', async () => {
    for (const db of [as(ALICE), as(ADMIN)]) {
      await assertFails(getDoc(doc(db, 'reminderLog', 'x')))
      await assertFails(getDoc(doc(db, 'planWatch', ALICE.uid)))
      await assertFails(setDoc(doc(db, 'reminderLog', 'y'), { uid: ALICE.uid }))
    }
  })
})
