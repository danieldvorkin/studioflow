import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'
import {
  CURRENT_USER,
  CLASS_TEMPLATES,
  CLASS_SESSIONS,
  BOOKINGS,
  UPCOMING_BOOKABLE_CLASS_SESSIONS_COUNT,
} from '../apollo/queries'
import { useLocationContext } from '../location/LocationProvider'
import { useStudio } from '../studio/StudioProvider'

function withinDays(dateLike, days, now = new Date()) {
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return false
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  return d >= start
}

function futureWithinDays(dateLike, days, now = new Date()) {
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return false
  const end = new Date(now)
  end.setDate(end.getDate() + days)
  return d > now && d <= end
}

function formatCents(cents, currency) {
  const amount = Number(cents)
  if (!Number.isFinite(amount)) return '—'
  const cur = (currency || 'cad').toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(amount / 100)
  } catch {
    return `${(amount / 100).toFixed(2)} ${cur}`
  }
}

function StatCard({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-50">{value}</div>
      {helper && <div className="mt-1 text-[11px] text-slate-500">{helper}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { data: userData } = useQuery(CURRENT_USER)
  const { selectedStudioId } = useStudio()
  const { locationId, locations } = useLocationContext()
  const roleName = (userData?.currentUser?.roleName || '').toString().toLowerCase()
  const roleInt = userData?.currentUser?.role
  const isClient = roleName === 'client'

  const { data: templatesData, loading: templatesLoading } = useQuery(CLASS_TEMPLATES, {
    variables: { studioLocationId: locationId || null, studioId: isClient ? selectedStudioId : null },
    skip: isClient && !selectedStudioId,
  })
  const { data: sessionsData, loading: sessionsLoading } = useQuery(CLASS_SESSIONS, {
    variables: { from: null, to: null, studioLocationId: locationId || null, studioId: isClient ? selectedStudioId : null },
    skip: isClient && !selectedStudioId,
  })
  const { data: bookingsData, loading: bookingsLoading } = useQuery(BOOKINGS, {
    variables: { studioLocationId: locationId || null, studioId: isClient ? selectedStudioId : null },
    skip: isClient && !selectedStudioId,
  })

  const { data: upcomingAllStudiosData, loading: upcomingAllStudiosLoading } = useQuery(UPCOMING_BOOKABLE_CLASS_SESSIONS_COUNT, {
    skip: !isClient,
    variables: { studioId: null, studioLocationId: null },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  })

  const user = userData?.currentUser
  const templates = templatesData?.classTemplates || []
  const sessions = sessionsData?.classSessions || []
  const bookings = bookingsData?.bookings || []

  // roleName/roleInt already computed above
  const isOwner = roleName === 'owner' || roleName === 'owner_user' || roleName === 'owneruser' || roleInt === 0
  const isStaff = roleName === 'staff' || roleInt === 1
  const isInstructor = roleName === 'instructor'
  // isClient already computed above

  const now = new Date()

  const selectedLocation = (locations || []).find((l) => l.id === locationId) || null

  const instructorsByLocation = (() => {
    const byLoc = new Map()
    for (const t of templates) {
      const locId = t?.studioLocation?.id || 'unknown'
      const locName = t?.studioLocation?.name || 'All locations'
      const inst = t?.instructor
      if (!inst?.id) continue

      const locEntry = byLoc.get(locId) || { id: locId, name: locName, instructors: new Map() }
      const instEntry = locEntry.instructors.get(inst.id) || { id: inst.id, name: inst.name || inst.email || 'Instructor', classes: new Set() }
      if (t?.title) instEntry.classes.add(t.title)

      locEntry.instructors.set(inst.id, instEntry)
      byLoc.set(locId, locEntry)
    }

    return Array.from(byLoc.values()).map((loc) => {
      const instructors = Array.from(loc.instructors.values())
        .map((i) => ({ ...i, classes: Array.from(i.classes.values()).slice(0, 3) }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      return { id: loc.id, name: loc.name, instructors }
    })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  })()

  const fromPaymentCurrency = bookings.find((b) => b?.payment?.currency)?.payment?.currency
  const fromTemplateCurrency = templates.find((t) => t?.currency)?.currency
  const currency = (fromPaymentCurrency || fromTemplateCurrency || 'cad').toUpperCase()

  const scopedSessions = isInstructor
    ? sessions.filter((s) => s.instructor && s.instructor.id === user?.id)
    : sessions

  const activeBookings = bookings.filter((b) => b && b.status !== 'cancelled' && !b.archived)

  const upcomingSessions = [...scopedSessions]
    .filter((s) => new Date(s.startTime) > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 6)

  const upcomingBookings = [...activeBookings]
    .filter((b) => new Date(b.classSession.startTime) > now)
    .sort((a, b) => new Date(a.classSession.startTime) - new Date(b.classSession.startTime))
    .slice(0, 6)

  const bookableSessions = (() => {
    if (!isClient) return []

    const bookedSessionIds = new Set(activeBookings.map((b) => b?.classSession?.id).filter(Boolean))
    return [...sessions]
      .filter((s) => futureWithinDays(s.startTime, 14, now))
      .filter((s) => !bookedSessionIds.has(s.id))
      .filter((s) => typeof s.seatsAvailable !== 'number' || s.seatsAvailable > 0)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 8)
  })()

  const ownerLike = isOwner || isStaff

  const analytics = (() => {
    const paid = activeBookings.filter((b) => b.paid)

    const paidLast30 = paid.filter((b) => withinDays(b.createdAt, 30, now))
    const paidLast7 = paid.filter((b) => withinDays(b.createdAt, 7, now))
    const allLast7 = activeBookings.filter((b) => withinDays(b.createdAt, 7, now))

    const grossLast30 = paidLast30.reduce((sum, b) => {
      const cents = b?.payment?.amountCents ?? b?.priceCents ?? 0
      return sum + (Number(cents) || 0)
    }, 0)
    const grossLast7 = paidLast7.reduce((sum, b) => {
      const cents = b?.payment?.amountCents ?? b?.priceCents ?? 0
      return sum + (Number(cents) || 0)
    }, 0)

    const upcoming7 = sessions.filter((s) => futureWithinDays(s.startTime, 7, now))
    const fillRates = upcoming7
      .map((s) => {
        if (typeof s.capacity !== 'number' || typeof s.seatsAvailable !== 'number') return null
        if (s.capacity <= 0) return null
        const bookedCount = Math.max(0, s.capacity - s.seatsAvailable)
        return bookedCount / s.capacity
      })
      .filter((v) => typeof v === 'number')
    const avgFillRate = fillRates.length ? (fillRates.reduce((a, b) => a + b, 0) / fillRates.length) : null

    const templateMap = new Map()
    for (const b of paidLast30) {
      const t = b?.classSession?.classTemplate
      if (!t?.id) continue
      const prev = templateMap.get(t.id) || { title: t.title || 'Class', grossCents: 0, count: 0 }
      const cents = b?.payment?.amountCents ?? b?.priceCents ?? 0
      templateMap.set(t.id, { ...prev, grossCents: prev.grossCents + (Number(cents) || 0), count: prev.count + 1 })
    }
    const topTemplates = [...templateMap.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.grossCents - a.grossCents)
      .slice(0, 5)

    return {
      grossLast30,
      grossLast7,
      paidLast30Count: paidLast30.length,
      paidLast7Count: paidLast7.length,
      bookingsLast7Count: allLast7.length,
      avgFillRate,
      topTemplates,
      upcoming7Count: upcoming7.length,
    }
  })()

  const instructorAnalytics = (() => {
    if (!isInstructor) return null

    const paid = activeBookings.filter((b) => b.paid)
    const paidLast30 = paid.filter((b) => withinDays(b.createdAt, 30, now))
    const grossLast30 = paidLast30.reduce((sum, b) => {
      const cents = b?.payment?.amountCents ?? b?.priceCents ?? 0
      return sum + (Number(cents) || 0)
    }, 0)

    const upcoming7 = scopedSessions.filter((s) => futureWithinDays(s.startTime, 7, now))
    const fillRates = upcoming7
      .map((s) => {
        if (typeof s.capacity !== 'number' || typeof s.seatsAvailable !== 'number') return null
        if (s.capacity <= 0) return null
        const bookedCount = Math.max(0, s.capacity - s.seatsAvailable)
        return bookedCount / s.capacity
      })
      .filter((v) => typeof v === 'number')
    const avgFillRate = fillRates.length ? (fillRates.reduce((a, b) => a + b, 0) / fillRates.length) : null

    return {
      grossLast30,
      paidLast30Count: paidLast30.length,
      upcoming7Count: upcoming7.length,
      avgFillRate,
    }
  })()

  const firstTemplateId = templates[0]?.id
  const anyTemplateSessionsLink = firstTemplateId ? `/templates/${firstTemplateId}/sessions` : '/templates'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          {user ? `Welcome back, ${user.name || user.email}` : 'Pilates Studio Dashboard'}
        </h1>
        <p className="text-sm text-slate-400">
          {isClient
            ? 'Book your next class in a couple of clicks.'
            : (isInstructor
              ? 'A quick pulse-check on your classes and bookings.'
              : 'A location-focused pulse-check on bookings and revenue.')}
        </p>
        {selectedLocation && (
          <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Location: <span className="text-slate-300">{selectedLocation.name}</span>
          </div>
        )}
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              {isClient ? 'Your bookings' : (isInstructor ? 'Your upcoming classes' : 'Location performance')}
            </h2>
            <span className="text-[11px] text-slate-500">
              {(templatesLoading || sessionsLoading || bookingsLoading) ? 'Loading…' : 'Updated just now'}
            </span>
          </div>

          {(templatesLoading || sessionsLoading || bookingsLoading) && (
            <p className="text-sm text-slate-400">Loading dashboard…</p>
          )}

          {!templatesLoading && !sessionsLoading && !bookingsLoading && ownerLike && (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatCard
                  label="Revenue (30d)"
                  value={formatCents(analytics.grossLast30, currency)}
                  helper={`${analytics.paidLast30Count} paid bookings`}
                />
                <StatCard
                  label="Bookings (7d)"
                  value={analytics.bookingsLast7Count}
                  helper={`${analytics.paidLast7Count} paid`}
                />
                <StatCard
                  label="Fill rate (7d)"
                  value={analytics.avgFillRate == null ? '—' : `${Math.round(analytics.avgFillRate * 100)}%`}
                  helper={`${analytics.upcoming7Count} sessions upcoming`}
                />
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Top classes (30d)</div>
                {analytics.topTemplates.length === 0 ? (
                  <p className="mt-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                    No paid bookings in the last 30 days.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {analytics.topTemplates.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-50">{t.title}</div>
                          <div className="text-[11px] text-slate-400">{t.count} bookings</div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold text-slate-100">
                          {formatCents(t.grossCents, currency)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {!templatesLoading && !sessionsLoading && !bookingsLoading && isInstructor && !ownerLike && (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatCard
                  label="Revenue (30d)"
                  value={formatCents(instructorAnalytics?.grossLast30 || 0, currency)}
                  helper={`${instructorAnalytics?.paidLast30Count || 0} paid bookings`}
                />
                <StatCard
                  label="Sessions (7d)"
                  value={instructorAnalytics?.upcoming7Count || 0}
                  helper="Upcoming on your calendar"
                />
                <StatCard
                  label="Fill rate (7d)"
                  value={instructorAnalytics?.avgFillRate == null ? '—' : `${Math.round(instructorAnalytics.avgFillRate * 100)}%`}
                  helper="Based on sessions with capacity"
                />
              </div>

              {upcomingSessions.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                  No upcoming sessions on your schedule.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2">
                  {upcomingSessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 flex-col text-sm">
                        <span className="truncate font-medium text-slate-50">
                          {s.classTemplate?.title || 'Class'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(s.startTime).toLocaleString()}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                          <span>Room: {s.room || 'TBD'}</span>
                          {typeof s.seatsAvailable === 'number' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              {s.seatsAvailable} spots left
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Link
                          to={`/booking/${s.id}`}
                          className="inline-flex items-center rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-on-accent hover:bg-sky-400"
                        >
                          Book a client
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {!templatesLoading && !sessionsLoading && !bookingsLoading && isClient && (
            <>
              {!selectedStudioId && (
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <StatCard
                    label="Upcoming sessions"
                    value={upcomingAllStudiosLoading ? '…' : (upcomingAllStudiosData?.upcomingBookableClassSessionsCount ?? 0)}
                    helper="Across all studios"
                  />
                </div>
              )}

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-slate-300">
                  {upcomingBookings.length ? (
                    <span>
                      Next class: <span className="font-semibold text-slate-50">{new Date(upcomingBookings[0].classSession.startTime).toLocaleString()}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">No upcoming bookings yet.</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/schedule"
                    className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400"
                  >
                    Browse schedule
                  </Link>
                  <Link
                    to="/bookings"
                    className="inline-flex items-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
                  >
                    View bookings
                  </Link>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Book a class</div>
                {!selectedStudioId ? (
                  <p className="mt-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                    Select a studio from the studio picker to browse and book sessions.
                  </p>
                ) : bookableSessions.length === 0 ? (
                  <p className="mt-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                    No open spots in the next two weeks.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {bookableSessions.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-50">
                            {s.classTemplate?.title || 'Class'}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">{new Date(s.startTime).toLocaleString()}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                            {s.instructor?.name && <span>{s.instructor.name}</span>}
                            {s.room && <span>· Room {s.room}</span>}
                            {typeof s.seatsAvailable === 'number' && <span>· {s.seatsAvailable} spots left</span>}
                            {typeof s.classTemplate?.priceCents === 'number' && <span>· {formatCents(s.classTemplate.priceCents, s.classTemplate.currency || currency)}</span>}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <Link
                            to={`/booking/${s.id}`}
                            className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400"
                          >
                            Book now
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Your upcoming bookings</div>
                {upcomingBookings.length === 0 ? (
                  <p className="mt-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                    Your next booking will show up here.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {upcomingBookings.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-50">
                            {b.classSession.classTemplate?.title || 'Class'}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">{new Date(b.classSession.startTime).toLocaleString()}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                            <span className="uppercase tracking-[0.12em]">{b.status}</span>
                            {b.classSession.room && <span>· Room {b.classSession.room}</span>}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <Link
                            to={`/bookings/${b.id}`}
                            className="inline-flex items-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
                          >
                            Details
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                {isClient ? 'Studio' : 'Overview'}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <StatCard
                label="Classes"
                value={templates.length}
                helper={isClient ? 'Programs you can book' : 'Programs you can schedule'}
              />
              <StatCard
                label="Sessions"
                value={sessions.length}
                helper={isClient ? 'On the calendar' : 'Available to manage'}
              />
            </div>

            {isClient && (
              <div className="mt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Instructors</div>
                {instructorsByLocation.length === 0 ? (
                  <p className="mt-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                    No instructors are listed for this location yet.
                  </p>
                ) : selectedLocation ? (
                  (() => {
                    const loc = instructorsByLocation.find((l) => l.id === selectedLocation.id)
                    const instructors = loc?.instructors || []
                    if (instructors.length === 0) {
                      return (
                        <p className="mt-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                          No instructors are listed for {selectedLocation.name} yet.
                        </p>
                      )
                    }
                    return (
                      <ul className="mt-2 flex flex-col gap-2">
                        {instructors.slice(0, 6).map((i) => (
                          <li key={i.id} className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
                            <div className="text-sm font-medium text-slate-50">{i.name}</div>
                            {i.classes.length > 0 && (
                              <div className="mt-0.5 text-[11px] text-slate-400">
                                Teaches: {i.classes.join(', ')}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )
                  })()
                ) : (
                  <div className="mt-2 space-y-3">
                    {instructorsByLocation.slice(0, 3).map((loc) => (
                      <div key={loc.id}>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{loc.name}</div>
                        {loc.instructors.length === 0 ? (
                          <div className="mt-1 text-xs text-slate-500">No instructors listed.</div>
                        ) : (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {loc.instructors.slice(0, 6).map((i) => (
                              <span
                                key={i.id}
                                className="rounded-full border border-slate-700 bg-slate-950/30 px-2 py-0.5 text-[11px] text-slate-200"
                              >
                                {i.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Link
                to={isClient ? '/schedule' : '/templates'}
                className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-800"
              >
                {isClient ? 'Browse schedule' : 'Manage classes'}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Quick links
            </h2>
            <ul className="flex flex-col gap-1 text-sm">
              {isClient ? (
                <>
                  <li>
                    <Link
                      to="/schedule"
                      className="inline-flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 hover:border-sky-500/60 hover:bg-slate-900"
                    >
                      <span>Browse schedule</span>
                      <span className="text-xs text-slate-500">Find a class to book</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/bookings"
                      className="inline-flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 hover:border-sky-500/60 hover:bg-slate-900"
                    >
                      <span>Your bookings</span>
                      <span className="text-xs text-slate-500">View status and receipts</span>
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      to="/schedule"
                      className="inline-flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 hover:border-sky-500/60 hover:bg-slate-900"
                    >
                      <span>Schedule</span>
                      <span className="text-xs text-slate-500">See the calendar</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/templates"
                      className="inline-flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 hover:border-sky-500/60 hover:bg-slate-900"
                    >
                      <span>Classes</span>
                      <span className="text-xs text-slate-500">Programs and pricing</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={anyTemplateSessionsLink}
                      className="inline-flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 hover:border-sky-500/60 hover:bg-slate-900"
                    >
                      <span>Sessions</span>
                      <span className="text-xs text-slate-500">See upcoming roster</span>
                    </Link>
                  </li>
                  {ownerLike && (
                    <li>
                      <Link
                        to="/bookings"
                        className="inline-flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 hover:border-sky-500/60 hover:bg-slate-900"
                      >
                        <span>Bookings</span>
                        <span className="text-xs text-slate-500">Revenue and activity</span>
                      </Link>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
