import { useState } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { useCourseStaff } from '../hooks/useCourseStaff'
import {
  coordinatorMail,
  lecturerMail,
  loadStudentInfo,
  saveStudentInfo,
  subject,
  type ChangeRequest,
  type StudentInfo,
} from '../lib/groupChange'
import type { GroupOption } from '../lib/optimizer'
import type { StaffPerson } from '../lib/staff'
import { typeLabel } from '../lib/usos'
import { USOSWEB_PERSON_URL, type PersonInfo } from '../lib/usosPeople'
import { Dialog } from './Dialog'

interface Props {
  courseName: string
  classType: string // kod USOS: CWI, LAB...
  from: GroupOption
  to: GroupOption
  fromWhen: string // "wt. 15:15"
  toWhen: string
  onClose: () => void
}

// Prośba o zmianę grupy: do kogo napisać (z tytułami i profilem w USOSweb) i dwa gotowe maile.
export function GroupChangeDialog({ courseName, classType, from, to, fromWhen, toWhen, onClose }: Props) {
  const { cloud, displayName } = usePlanUi()
  const [me, setMe] = useState<StudentInfo>(loadStudentInfo)
  // Rozwinięte na start, gdy brakuje danych - i nie zwija się w trakcie wpisywania.
  const [askForData] = useState(() => !me.name || !me.album)
  const { staff, people, status } = useCourseStaff(
    [
      { unitId: from.unitId, groupNumber: from.groupNumber, type: classType },
      { unitId: to.unitId, groupNumber: to.groupNumber, type: classType },
    ],
    cloud,
  )

  const update = (patch: Partial<StudentInfo>) => {
    const next = { ...me, ...patch }
    setMe(next)
    saveStudentInfo(next)
  }

  const request: ChangeRequest = {
    course: courseName,
    classType: typeLabel(classType),
    from: { group: from.groupNumber, when: fromWhen },
    to: { group: to.groupNumber, when: toWhen },
  }
  const lecturersOf = (group: number) => staff?.groups.find((g) => g.groupNumber === group)?.lecturers ?? []
  const target = lecturersOf(to.groupNumber)
  const sameTeacher =
    target.length > 0 && target.every((p) => lecturersOf(from.groupNumber).some((q) => q.id === p.id))

  return (
    <Dialog title="Prośba o zmianę grupy" onClose={onClose}>
      <div className="group-change">
        <p className="muted">
          {displayName(courseName)} · {typeLabel(classType)}: gr. {from.groupNumber} ({fromWhen}) →{' '}
          <strong>
            gr. {to.groupNumber} ({toWhen})
          </strong>
        </p>

        {status.kind === 'loading' && <p className="muted loading-line">Sprawdzam prowadzących w USOS…</p>}
        {status.kind === 'error' && <p className="muted">Nie udało się pobrać prowadzących z USOS.</p>}

        <details className="collapsible" open={askForData}>
          <summary>Twoje dane do maili (zostają tylko w tej przeglądarce)</summary>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Imię i nazwisko</span>
              <input className="text-input" value={me.name} onChange={(e) => update({ name: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Nr albumu</span>
              <input className="text-input" inputMode="numeric" value={me.album} onChange={(e) => update({ album: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Jestem…</span>
              <input
                className="text-input"
                value={me.intro}
                placeholder="studentem 3. semestru Inżynierii Biomedycznej"
                onChange={(e) => update({ intro: e.target.value })}
              />
            </label>
          </div>
        </details>

        <ol className="group-change-steps">
          <li>
            <strong>Zgoda prowadzącego grupy {to.groupNumber}</strong>
            {sameTeacher && <span className="muted"> - ta sama osoba prowadzi też Twoją obecną grupę</span>}
            <People list={target} people={people} />
            <MailBox subject={subject(request)} body={lecturerMail(request, me)} />
          </li>
          <li>
            <strong>Wpis w USOS u koordynatora</strong>
            <span className="muted"> - jeśli prowadzący sam nie może zmienić grupy (dołącz jego odpowiedź)</span>
            <People list={staff?.coordinators ?? []} people={people} />
            <MailBox subject={subject(request)} body={coordinatorMail(request, me)} />
          </li>
        </ol>

        <p className="hint">
          Adres e-mail znajdziesz w Outlooku PW po nazwisku albo wyślij wiadomość z profilu w USOSweb („wyślij wiadomość
          do użytkownika”).
        </p>
      </div>
    </Dialog>
  )
}

function People({ list, people }: { list: StaffPerson[]; people: Record<string, PersonInfo> }) {
  if (list.length === 0) return null
  return (
    <span className="group-change-people">
      {list.map((p) => (
        <a key={p.id} href={`${USOSWEB_PERSON_URL}${p.id}`} target="_blank" rel="noreferrer">
          {people[p.id]?.title ? `${people[p.id]!.title} ` : ''}
          {p.name} ↗
        </a>
      ))}
    </span>
  )
}

function MailBox({ subject, body }: { subject: string; body: string }) {
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null)
  const copy = async (what: 'subject' | 'body', text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      setCopied(null)
    }
  }
  return (
    <div className="mail-box">
      <div className="mail-subject">
        <span className="muted small">Temat:</span> {subject}
      </div>
      <pre className="mail-body">{body}</pre>
      <div className="button-row">
        <button type="button" className="button small secondary" onClick={() => void copy('subject', subject)}>
          {copied === 'subject' ? 'Skopiowano ✓' : 'Kopiuj temat'}
        </button>
        <button type="button" className="button small" onClick={() => void copy('body', body)}>
          {copied === 'body' ? 'Skopiowano ✓' : 'Kopiuj treść'}
        </button>
      </div>
    </div>
  )
}
