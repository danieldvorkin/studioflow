import { useMemo } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { STUDIO_SHOW } from '../apollo/queries'
import { useAuth } from '../auth/AuthProvider'
import { useStudio } from '../studio/StudioProvider'

function dollarsFromCents(cents, currency) {
  if (typeof cents !== 'number') return 'Free'
  const amount = (cents / 100).toFixed(2)
  const c = (currency || 'cad').toUpperCase()
  return `${c === 'USD' ? '$' : 'CA$'}${amount}`
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function isoDateKey(iso) {
  if (!iso) return ''
  return new Date(iso).toDateString()
}

function InstructorCard({ instructor }) {
  const initials = (instructor.name || instructor.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-center">
      {instructor.avatarUrl ? (
        <img
          src={instructor.avatarUrl}
          alt={instructor.name}
          className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-700"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-fuchsia-500 text-lg font-bold text-white ring-2 ring-slate-700">
          {initials}
        </div>
      )}
      <div>
        <div className="font-semibold text-slate-100">{instructor.name || instructor.email}</div>
        <div className="mt-0.5 text-[11px] uppercase tracking-[0.22em] text-slate-500">Instructor</div>
      </div>
    </div>
  )
}

function PerkList({ plan }) {
  const perks = []
  if (plan.reformerClassesPerMonth == null) {
    perks.push('Unlimited Reformer classes / month')
  } else {
    perks.push(`${plan.reformerClassesPerMonth} Reformer class${plan.reformerClassesPerMonth !== 1 ? 'es' : ''} / month`)
  }
  if (plan.matClassesPerMonth != null) {
    perks.push(`${plan.matClassesPerMonth} Mat / Barre / Yoga class${plan.matClassesPerMonth !== 1 ? 'es' : ''} / month`)
  }
  if (plan.includesPriorityBooking) perks.push('Priority Booking')
  if (plan.includesEarlyBooking) perks.push('Early Booking Access')
  if (plan.privateSessionDiscountPercent > 0) perks.push(`${plan.privateSessionDiscountPercent}% Off Private Sessions`)
  if (plan.guestPassesPerMonth > 0) perks.push(`${plan.guestPassesPerMonth} Guest Pass${plan.guestPassesPerMonth > 1 ? 'es' : ''} / Month`)
  if (plan.includesRetailDiscount) perks.push('Retail Discount')
  return (
    <ul className="space-y-1 mt-2">
      {perks.map((p, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
          <span className="mt-0.5 text-sky-400">•</span>
          {p}
        </li>
      ))}
    </ul>
  )
}

export default function StudioShowPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const role = (user?.roleName || '').toString().toLowerCase()
  const isClient = role === 'client' || user?.role === 2

  const { studios, selectedStudioId, setSelectedStudioId } = useStudio()
  const hasMultipleStudios = studios.length > 1
  const isSelected = selectedStudioId === id

  const { data, loading, error } = useQuery(STUDIO_SHOW, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  })

  const studio = data?.studio

  // Group upcoming sessions by calendar day
  const sessionsByDay = useMemo(() => {
    const sessions = studio?.upcomingClassSessions || []
    const groups = {}
    sessions.forEach((s) => {
      const key = isoDateKey(s.startTime)
      if (!groups[key]) groups[key] = []
      groups[key].push(s)
    })
    return Object.entries(groups)
  }, [studio?.upcomingClassSessions])

  if (!user) return <Navigate to="/signin" replace />
  if (error) return (
    <div className="rounded-xl border border-red-500/30 bg-red-900/10 p-6 text-sm text-red-300">
      Could not load studio. Please try again.
    </div>
  )

  if (loading && !studio) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-800" />
        <div className="h-40 w-full animate-pulse rounded-2xl bg-slate-900" />
      </div>
    )
  }

  if (!studio) return <div className="text-sm text-slate-400">Studio not found.</div>

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-50">{studio.name}</h1>
          {studio.studioLocations?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              {studio.studioLocations.map((loc) => (
                <span
                  key={loc.id}
                  className="rounded-full border border-slate-700 px-2.5 py-0.5 text-[11px] text-slate-400"
                >
                  {loc.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isClient && hasMultipleStudios && !isSelected && (
            <button
              type="button"
              onClick={() => setSelectedStudioId(id)}
              className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-400"
            >
              Select this studio
            </button>
          )}
          {isSelected && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-900/20 px-4 py-2 text-sm font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Your studio
            </span>
          )}
          {isSelected && (
            <Link
              to="/schedule"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              View full schedule →
            </Link>
          )}
        </div>
      </div>

      {/* Instructors */}
      {studio.instructors?.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-sky-400">
            Instructors
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {studio.instructors.map((inst) => (
              <InstructorCard key={inst.id} instructor={inst} />
            ))}
          </div>
        </section>
      )}

      {/* Schedule preview */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-sky-400">
            Upcoming Classes
          </h2>
          {isSelected && (
            <Link
              to="/schedule"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              Full calendar →
            </Link>
          )}
        </div>

        {sessionsByDay.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
            No upcoming classes in the next two weeks.
          </div>
        )}

        <div className="flex flex-col gap-5">
          {sessionsByDay.map(([dateKey, sessions]) => (
            <div key={dateKey}>
              <div className="mb-2 text-sm font-semibold text-slate-300">
                {formatDateLabel(sessions[0].startTime)}
              </div>
              <div className="flex flex-col gap-2">
                {sessions.map((s) => {
                  const full = s.seatsAvailable === 0
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between gap-4 rounded-xl border bg-slate-900 px-4 py-3 ${
                        full ? 'border-slate-800 opacity-60' : 'border-slate-700'
                      }`}
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="truncate font-medium text-slate-100">
                          {s.classTemplate?.title || 'Class'}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                          <span>{formatTime(s.startTime)}</span>
                          {s.classTemplate?.durationMinutes && (
                            <span>· {s.classTemplate.durationMinutes} min</span>
                          )}
                          {s.instructor?.name && <span>· {s.instructor.name}</span>}
                          {s.room && <span>· {s.room}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {s.classTemplate?.priceCents > 0 && (
                          <div className="text-sm font-semibold text-sky-400">
                            {dollarsFromCents(s.classTemplate.priceCents, s.classTemplate.currency)}
                          </div>
                        )}
                        <div className={`text-[11px] ${full ? 'text-red-400' : 'text-slate-400'}`}>
                          {full ? 'Full' : `${s.seatsAvailable} spot${s.seatsAvailable === 1 ? '' : 's'} left`}
                        </div>
                        {isSelected && !full && (
                          <Link
                            to={`/booking/${s.id}`}
                            className="mt-1 rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-400"
                          >
                            Book
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Memberships */}
      {studio.membershipPlans?.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-sky-400">
              Membership Plans
            </h2>
            {isSelected && (
              <Link
                to="/my-memberships"
                className="text-xs font-semibold text-sky-400 hover:text-sky-300"
              >
                Enroll →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {studio.membershipPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 p-5"
              >
                <div className="font-semibold text-slate-100">{plan.name}</div>
                <div className="text-2xl font-bold text-sky-400">
                  {dollarsFromCents(plan.priceCents, plan.currency)}
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    /{(plan.currency || 'cad').toUpperCase()}/mo
                  </span>
                </div>
                {plan.description && (
                  <p className="text-xs text-slate-400">{plan.description}</p>
                )}
                <PerkList plan={plan} />
                <div className="mt-auto pt-3 text-xs text-slate-500">
                  {plan.minCommitmentMonths}-month commitment · {plan.autoRenew ? 'Auto-renews' : 'No auto-renew'}
                </div>
                {isSelected && (
                  <Link
                    to="/my-memberships"
                    className="mt-1 w-full rounded-full bg-sky-500 py-2 text-center text-sm font-semibold text-white hover:bg-sky-400"
                  >
                    Subscribe
                  </Link>
                )}
              </div>
            ))}
          </div>
          {!isSelected && (
            <p className="mt-3 text-xs text-slate-500">
              Select this studio to view pricing and enroll in a membership.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
