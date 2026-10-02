import { inLanguage, t } from '../lib/i18n'
import { describeOption } from '../lib/optimizerSettings'
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

  // Mail idzie do polskich prowadzących - typ zajęć i terminy zawsze po polsku, nawet w wersji angielskiej.
  const request: ChangeRequest = inLanguage('pl', () => ({
    course: courseName,
    classType: typeLabel(classType),
    from: { group: from.groupNumber, when: describeOption(from) },
    to: { group: to.groupNumber, when: describeOption(to) },
  }))
  const lecturersOf = (group: number) => staff?.groups.find((g) => g.groupNumber === group)?.lecturers ?? []
  const target = lecturersOf(to.groupNumber)
  const sameTeacher =
    target.length > 0 && target.every((p) => lecturersOf(from.groupNumber).some((q) => q.id === p.id))

  return (
    <Dialog title={t('Prośba o zmianę grupy')} onClose={onClose}>
      <div className="group-change">
        <p className="muted">
          {displayName(courseName)} · {typeLabel(classType)}: {t('gr. {n}', { n: from.groupNumber })} ({fromWhen}) →{' '}
          <strong>
            {t('gr. {n}', { n: to.groupNumber })} ({toWhen})
          </strong>
        </p>

        {status.kind === 'loading' && <p className="muted loading-line">{t('Sprawdzam prowadzących w USOS…')}</p>}
        {status.kind === 'error' && <p className="muted">{t('Nie udało się pobrać prowadzących z USOS.')}</p>}

        <details className="collapsible" open={askForData}>
          <summary>{t('Twoje dane do maili (zostają tylko w tej przeglądarce)')}</summary>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">{t('Imię i nazwisko')}</span>
              <input className="text-input" value={me.name} onChange={(e) => update({ name: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">{t('Nr albumu')}</span>
              <input className="text-input" inputMode="numeric" value={me.album} onChange={(e) => update({ album: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">{t('Jestem…')}</span>
              <input
                className="text-input"
                value={me.intro}
                placeholder="studentem 3. semestru Inżynierii Biomedycznej" // wchodzi do maila po polsku
                onChange={(e) => update({ intro: e.target.value })}
              />
            </label>
          </div>
        </details>

        <ol className="group-change-steps">
          <li>
            <strong>{t('Zgoda prowadzącego grupy {n}', { n: to.groupNumber })}</strong>
            {sameTeacher && <span className="muted"> {t('- ta sama osoba prowadzi też Twoją obecną grupę')}</span>}
            <People list={target} people={people} />
            <MailBox subject={subject(request)} body={lecturerMail(request, me)} />
          </li>
          <li>
            <strong>{t('Wpis w USOS u koordynatora')}</strong>
            <span className="muted"> {t('- jeśli prowadzący sam nie może zmienić grupy (dołącz jego odpowiedź)')}</span>
            <People list={staff?.coordinators ?? []} people={people} />
            <MailBox subject={subject(request)} body={coordinatorMail(request, me)} />
          </li>
        </ol>

        <p className="hint">
          {t('Adres e-mail znajdziesz w Outlooku PW po nazwisku albo wyślij wiadomość z profilu w USOSweb („wyślij wiadomość do użytkownika”).')}
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
        <span className="muted small">{t('Temat:')}</span> {subject}
      </div>
      <pre className="mail-body">{body}</pre>
      <div className="button-row">
        <button type="button" className="button small secondary" onClick={() => void copy('subject', subject)}>
          {copied === 'subject' ? t('Skopiowano ✓') : t('Kopiuj temat')}
        </button>
        <button type="button" className="button small" onClick={() => void copy('body', body)}>
          {copied === 'body' ? t('Skopiowano ✓') : t('Kopiuj treść')}
        </button>
      </div>
    </div>
  )
}
