import { t } from '../lib/i18n'
import { usePlanUi } from '../hooks/planUi'
import { useCourseStaff } from '../hooks/useCourseStaff'
import { staffPeople, type StaffPerson } from '../lib/staff'
import type { Meeting } from '../lib/usos'
import { USOSWEB_PERSON_URL, type PersonInfo } from '../lib/usosPeople'

interface Props {
  meetings: Pick<Meeting, 'unitId' | 'groupNumber' | 'type'>[]
}

// Prowadzący przedmiotu z tytułami i profilem w USOSweb. E-maila nie podajemy - USOS go ukrywa,
// a zgadywany adres bywa zły (na profilu jest "wyślij wiadomość do użytkownika").
export function StaffSection({ meetings }: Props) {
  const { cloud } = usePlanUi()
  const { staff, people, status } = useCourseStaff(meetings, cloud)
  if (status.kind === 'none') return null
  const list = staff ? staffPeople(staff) : []

  return (
    <div className="panel staff">
      <h3 className="panel-title">{t('Prowadzący')}</h3>
      {status.kind === 'loading' && <p className="muted loading-line">{t('Sprawdzam w USOS…')}</p>}
      {status.kind === 'error' && <p className="muted">{t('Nie udało się pobrać prowadzących z USOS.')} {status.message}</p>}
      {list.length > 0 && (
        <>
          <div className="staff-list">
            {list.map(({ person, roles }) => (
              <Person key={person.id} person={person} roles={roles} info={people[person.id]} withTitles={cloud !== null} />
            ))}
          </div>
          <p className="hint">
            {t('E-mail jest na profilu w USOSweb („wyślij wiadomość do użytkownika”) albo w Outlooku PW po nazwisku.')}
          </p>
        </>
      )}
    </div>
  )
}

function Person({
  person,
  roles,
  info,
  withTitles,
}: {
  person: StaffPerson
  roles: string[]
  info?: PersonInfo
  withTitles: boolean
}) {
  const details = [info?.position, info?.unit].filter(Boolean).join(' · ')
  return (
    <a className="staff-person" href={`${USOSWEB_PERSON_URL}${person.id}`} target="_blank" rel="noreferrer">
      <span className="staff-name">
        {info?.title && <span className="staff-title">{info.title} </span>}
        {person.name}
      </span>
      <span className="staff-roles">{roles.join(' · ')}</span>
      <span className="staff-details">
        {details || (withTitles && !info ? t('tytuł pojawi się wkrótce') : '')}
        <span className="staff-link">{t('profil w USOSweb ↗')}</span>
      </span>
    </a>
  )
}
