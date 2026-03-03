import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
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

function parseDate(dateLike) {
  const d = new Date(dateLike)
  return Number.isNaN(d.getTime()) ? null : d
}

function startOfWeek(dateLike, weekStartsOn = 1) {
  const d = parseDate(dateLike)
  if (!d) return null
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  const day = out.getDay() // 0 Sun .. 6 Sat
  const diff = (day - weekStartsOn + 7) % 7
  out.setDate(out.getDate() - diff)
  return out
}

function addDays(dateLike, days) {
  const d = parseDate(dateLike)
  if (!d) return null
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

function formatShortDate(dateLike) {
  const d = parseDate(dateLike)
  if (!d) return '—'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d)
}

function pct(numerator, denominator) {
  const n = Number(numerator)
  const d = Number(denominator)
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return null
  return n / d
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

function StatCard({ label, value, helper, to, onClick }) {
  const content = (
    <>
      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-50">{value}</div>
      {helper && <div className="mt-1 text-[11px] text-slate-500">{helper}</div>}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-left hover:border-sky-500/60"
      >
        {content}
      </button>
    )
  }

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 hover:border-sky-500/60"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5">
      {content}
    </div>
  )
}

function StatRow({ label, value, helper, to, onClick }) {
  const content = (
    <>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-50">{label}</div>
        {helper && <div className="mt-0.5 text-[11px] text-slate-400">{helper}</div>}
      </div>
      <div className="shrink-0 text-sm font-semibold text-slate-100">{value}</div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-left hover:border-sky-500/60"
      >
        {content}
      </button>
    )
  }

  if (to) {
    return (
      <Link
        to={to}
        className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 hover:border-sky-500/60"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
      {content}
    </div>
  )
}

export default function Dashboard() {
  const { data: userData } = useQuery(CURRENT_USER)
  const { selectedStudioId } = useStudio()
  const { locationId, locations } = useLocationContext()
  const roleName = (userData?.currentUser?.roleName || '').toString().toLowerCase()
  const roleInt = userData?.currentUser?.role
  const isGodmode = roleName === 'godmode' || userData?.currentUser?.godmode === true
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
  const isOwner = isGodmode || roleName === 'owner' || roleName === 'owner_user' || roleName === 'owneruser' || roleInt === 0
  const isStaff = isGodmode || roleName === 'staff' || roleInt === 1
  const isInstructor = isGodmode || roleName === 'instructor'
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

  const [openSheet, setOpenSheet] = useState('')

  useEffect(() => {
    if (!openSheet) return

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpenSheet('')
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [openSheet])

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

  const ownerAnalytics = (() => {
    if (!ownerLike) return null

    const active = activeBookings
    const paid = active.filter((b) => b.paid)

    const lastNDays = (days) => {
      const start = addDays(now, -days)
      if (!start) return []
      return active.filter((b) => {
        const d = parseDate(b.createdAt)
        return d && d >= start
      })
    }

    const last30 = lastNDays(30)
    const last90 = lastNDays(90)

    const paidLast30 = last30.filter((b) => b.paid)
    const paidLast90 = last90.filter((b) => b.paid)

    const grossFor = (booking) => {
      const cents = booking?.payment?.amountCents ?? booking?.priceCents ?? 0
      return Number(cents) || 0
    }

    const funnel = (rows) => {
      const created = rows.length
      const cancelled = rows.filter((b) => b.status === 'cancelled').length
      const paidCount = rows.filter((b) => b.paid).length
      const unpaid = created - paidCount
      return {
        created,
        cancelled,
        paidCount,
        unpaid,
        paidRate: pct(paidCount, created),
        cancelRate: pct(cancelled, created),
      }
    }

    const funnel30 = funnel(last30)
    const funnel7 = funnel(lastNDays(7))

    const weekBuckets = (() => {
      const weeks = []
      const current = startOfWeek(now)
      if (!current) return weeks
      const earliest = addDays(current, -7 * 11)
      if (!earliest) return weeks

      const byKey = new Map()
      for (const b of paid) {
        const d = parseDate(b.createdAt)
        if (!d) continue
        if (d < earliest) continue
        const w = startOfWeek(d)
        if (!w) continue
        const key = w.toISOString().slice(0, 10)
        const prev = byKey.get(key) || { weekStart: w, grossCents: 0, paidCount: 0 }
        byKey.set(key, {
          ...prev,
          grossCents: prev.grossCents + grossFor(b),
          paidCount: prev.paidCount + 1,
        })
      }

      for (let i = 11; i >= 0; i -= 1) {
        const w = addDays(current, -7 * i)
        if (!w) continue
        const key = w.toISOString().slice(0, 10)
        const row = byKey.get(key) || { weekStart: w, grossCents: 0, paidCount: 0 }
        weeks.push(row)
      }
      return weeks
    })()

    const highestWeek = [...weekBuckets]
      .filter((w) => w.grossCents > 0)
      .sort((a, b) => b.grossCents - a.grossCents)[0] || null
    const lowestWeek = [...weekBuckets]
      .filter((w) => w.grossCents > 0)
      .sort((a, b) => a.grossCents - b.grossCents)[0] || null

    const weekDelta = (() => {
      if (weekBuckets.length < 2) return null
      const prev = weekBuckets[weekBuckets.length - 2]
      const cur = weekBuckets[weekBuckets.length - 1]
      if (!prev || !cur) return null
      const changeCents = (cur.grossCents || 0) - (prev.grossCents || 0)
      const changePct = pct(changeCents, prev.grossCents || 0)
      return { changeCents, changePct }
    })()

    const topInstructorsLast30 = (() => {
      const map = new Map()
      for (const b of paidLast30) {
        const inst = b?.classSession?.instructor
        if (!inst?.id) continue
        const prev = map.get(inst.id) || { id: inst.id, name: inst.name || 'Instructor', grossCents: 0, paidCount: 0, cancelledCount: 0, clients: new Set() }
        const next = {
          ...prev,
          grossCents: prev.grossCents + grossFor(b),
          paidCount: prev.paidCount + 1,
        }
        const clientId = b?.client?.id
        if (clientId) next.clients.add(clientId)
        map.set(inst.id, next)
      }
      for (const b of last30) {
        const inst = b?.classSession?.instructor
        if (!inst?.id) continue
        if (b.status !== 'cancelled') continue
        const prev = map.get(inst.id) || { id: inst.id, name: inst.name || 'Instructor', grossCents: 0, paidCount: 0, cancelledCount: 0, clients: new Set() }
        map.set(inst.id, { ...prev, cancelledCount: prev.cancelledCount + 1 })
      }
      return [...map.values()]
        .map((r) => ({
          ...r,
          uniqueClients: r.clients.size,
          cancelRate: pct(r.cancelledCount, r.paidCount + r.cancelledCount),
        }))
        .sort((a, b) => b.grossCents - a.grossCents)
    })()

    const topClassesLast30 = (() => {
      const map = new Map()
      for (const b of paidLast30) {
        const t = b?.classSession?.classTemplate
        if (!t?.id) continue
        const prev = map.get(t.id) || { id: t.id, title: t.title || 'Class', grossCents: 0, paidCount: 0, clients: new Set() }
        const next = {
          ...prev,
          grossCents: prev.grossCents + grossFor(b),
          paidCount: prev.paidCount + 1,
        }
        const clientId = b?.client?.id
        if (clientId) next.clients.add(clientId)
        map.set(t.id, next)
      }
      return [...map.values()]
        .map((r) => ({ ...r, uniqueClients: r.clients.size }))
        .sort((a, b) => b.grossCents - a.grossCents)
    })()

    const bottomClassesLast30 = (() => {
      const map = new Map()
      for (const b of paidLast30) {
        const t = b?.classSession?.classTemplate
        if (!t?.id) continue
        const prev = map.get(t.id) || { id: t.id, title: t.title || 'Class', grossCents: 0, paidCount: 0 }
        map.set(t.id, {
          ...prev,
          grossCents: prev.grossCents + grossFor(b),
          paidCount: prev.paidCount + 1,
        })
      }
      return [...map.values()]
        .filter((r) => r.paidCount > 0)
        .sort((a, b) => a.grossCents - b.grossCents)
    })()

    const clientCohorts = (() => {
      const byClient = new Map()
      for (const b of active) {
        const clientId = b?.client?.id
        if (!clientId) continue
        const created = parseDate(b.createdAt)
        if (!created) continue
        const prev = byClient.get(clientId) || {
          id: clientId,
          name: b?.client?.name || b?.client?.email || 'Client',
          firstBookingAt: created,
          lastBookingAt: created,
          paidCount: 0,
          bookingCount: 0,
        }
        const next = {
          ...prev,
          bookingCount: prev.bookingCount + 1,
          paidCount: prev.paidCount + (b.paid ? 1 : 0),
          firstBookingAt: created < prev.firstBookingAt ? created : prev.firstBookingAt,
          lastBookingAt: created > prev.lastBookingAt ? created : prev.lastBookingAt,
        }
        byClient.set(clientId, next)
      }

      const cutoff30 = addDays(now, -30)
      const cutoff90 = addDays(now, -90)
      const cutoff31 = addDays(now, -31)
      if (!cutoff30 || !cutoff90 || !cutoff31) return null

      const clients = [...byClient.values()]
      const activeLast30Clients = clients.filter((c) => c.lastBookingAt >= cutoff30)
      const active31to90 = clients.filter((c) => c.lastBookingAt < cutoff30 && c.lastBookingAt >= cutoff90)
      const dropoffClients = active31to90

      const newLast30 = clients.filter((c) => c.firstBookingAt >= cutoff30)
      const returningLast90 = clients.filter((c) => c.lastBookingAt >= cutoff90 && c.paidCount >= 2)
      const repeatRate90 = pct(returningLast90.length, clients.filter((c) => c.lastBookingAt >= cutoff90).length)

      const avgPaidBookingsPerActive30 = (() => {
        if (activeLast30Clients.length === 0) return null
        const paidCounts = activeLast30Clients.map((c) => c.paidCount)
        return paidCounts.reduce((a, b) => a + b, 0) / paidCounts.length
      })()

      return {
        clientsTotal: clients.length,
        activeLast30Count: activeLast30Clients.length,
        dropoff31to90Count: dropoffClients.length,
        newLast30Count: newLast30.length,
        returningLast90Count: returningLast90.length,
        repeatRate90,
        avgPaidBookingsPerActive30,
      }
    })()

    return {
      funnel30,
      funnel7,
      weekBuckets,
      highestWeek,
      lowestWeek,
      weekDelta,
      topInstructorsLast30,
      topClassesLast30,
      bottomClassesLast30,
      clientCohorts,
      paidLast30GrossCents: paidLast30.reduce((sum, b) => sum + grossFor(b), 0),
      paidLast30Count: paidLast30.length,
      paidLast90GrossCents: paidLast90.reduce((sum, b) => sum + grossFor(b), 0),
      paidLast90Count: paidLast90.length,
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

  const upcoming7ForDemand = [...sessions]
    .filter((s) => futureWithinDays(s?.startTime, 7, now))
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 20)

  const firstTemplateId = templates[0]?.id
  const anyTemplateSessionsLink = firstTemplateId ? `/templates/${firstTemplateId}/sessions` : '/templates'

  return (
    <div className="flex w-full flex-col gap-6">
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

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
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
                  onClick={ownerLike ? () => setOpenSheet('revenue') : undefined}
                />
                <StatCard
                  label="Bookings (7d)"
                  value={analytics.bookingsLast7Count}
                  helper={`${analytics.paidLast7Count} paid`}
                  onClick={ownerLike ? () => setOpenSheet('funnel') : undefined}
                />
                <StatCard
                  label="Fill rate (7d)"
                  value={analytics.avgFillRate == null ? '—' : `${Math.round(analytics.avgFillRate * 100)}%`}
                  helper={`${analytics.upcoming7Count} sessions upcoming`}
                  onClick={ownerLike ? () => setOpenSheet('sessions') : undefined}
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

              {ownerAnalytics && (
                <div className="mt-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Analytics</div>
                    <Link
                      to="/analytics"
                      className="text-[11px] font-medium text-slate-400 hover:text-slate-200"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <StatCard
                      label="Paid rate (30d)"
                      value={ownerAnalytics.funnel30.paidRate == null ? '—' : `${Math.round(ownerAnalytics.funnel30.paidRate * 100)}%`}
                      helper={`${ownerAnalytics.funnel30.paidCount}/${ownerAnalytics.funnel30.created} bookings paid`}
                      onClick={() => setOpenSheet('funnel')}
                    />
                    <StatCard
                      label="Cancel rate (30d)"
                      value={ownerAnalytics.funnel30.cancelRate == null ? '—' : `${Math.round(ownerAnalytics.funnel30.cancelRate * 100)}%`}
                      helper={`${ownerAnalytics.funnel30.cancelled} cancelled`}
                      onClick={() => setOpenSheet('funnel')}
                    />
                    <StatCard
                      label="Clients dropped (31–90d)"
                      value={ownerAnalytics.clientCohorts?.dropoff31to90Count ?? '—'}
                      helper="Booked recently, not in last 30d"
                      onClick={() => setOpenSheet('retention')}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Week-to-week (12w)</div>
                      <button
                        type="button"
                        onClick={() => setOpenSheet('revenue')}
                        className="block w-full mt-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-left hover:border-sky-500/60"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm text-slate-200">
                            This week vs last:{' '}
                            <span className="font-semibold text-slate-50">
                              {ownerAnalytics.weekDelta
                                ? formatCents(ownerAnalytics.weekDelta.changeCents, currency)
                                : '—'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {ownerAnalytics.weekDelta?.changePct == null
                              ? null
                              : `${Math.round(ownerAnalytics.weekDelta.changePct * 100)}%`}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2">
                          <StatRow
                            label="Highest week"
                            value={ownerAnalytics.highestWeek
                              ? formatCents(ownerAnalytics.highestWeek.grossCents, currency)
                              : '—'}
                            helper={ownerAnalytics.highestWeek
                              ? `${formatShortDate(ownerAnalytics.highestWeek.weekStart)}–${formatShortDate(addDays(ownerAnalytics.highestWeek.weekStart, 6))}`
                              : null}
                          />
                          <StatRow
                            label="Lowest week"
                            value={ownerAnalytics.lowestWeek
                              ? formatCents(ownerAnalytics.lowestWeek.grossCents, currency)
                              : '—'}
                            helper={ownerAnalytics.lowestWeek
                              ? `${formatShortDate(ownerAnalytics.lowestWeek.weekStart)}–${formatShortDate(addDays(ownerAnalytics.lowestWeek.weekStart, 6))}`
                              : null}
                          />
                        </div>

                        <div className="mt-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Last 6 weeks</div>
                          <div className="mt-2 grid grid-cols-1 gap-1.5">
                            {ownerAnalytics.weekBuckets.slice(-6).map((w) => (
                              <div
                                key={w.weekStart.toISOString()}
                                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/20 px-2.5 py-2"
                              >
                                <div className="text-xs text-slate-300">
                                  {formatShortDate(w.weekStart)}–{formatShortDate(addDays(w.weekStart, 6))}
                                </div>
                                <div className="text-xs font-semibold text-slate-100">
                                  {formatCents(w.grossCents, currency)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </button>
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Client retention</div>
                      <button
                        type="button"
                        onClick={() => setOpenSheet('retention')}
                        className="block w-full mt-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-left hover:border-sky-500/60"
                      >
                        <div className="grid grid-cols-1 gap-3">
                        <StatRow
                          label="Active clients (30d)"
                          value={ownerAnalytics.clientCohorts?.activeLast30Count ?? '—'}
                          helper={ownerAnalytics.clientCohorts
                            ? `${ownerAnalytics.clientCohorts.newLast30Count} new · ${ownerAnalytics.clientCohorts.clientsTotal} total`
                            : null}
                        />
                        <StatRow
                          label="Repeat rate (90d)"
                          value={ownerAnalytics.clientCohorts?.repeatRate90 == null
                            ? '—'
                            : `${Math.round(ownerAnalytics.clientCohorts.repeatRate90 * 100)}%`}
                          helper={ownerAnalytics.clientCohorts
                            ? `${ownerAnalytics.clientCohorts.returningLast90Count} repeat clients`
                            : null}
                        />
                        <StatRow
                          label="Avg paid bookings / active client (30d)"
                          value={ownerAnalytics.clientCohorts?.avgPaidBookingsPerActive30 == null
                            ? '—'
                            : ownerAnalytics.clientCohorts.avgPaidBookingsPerActive30.toFixed(1)}
                          helper="Proxy for drop-off / stickiness"
                        />

                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Booking funnel</div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg border border-slate-800 bg-slate-950/20 px-2.5 py-2">
                              <div className="text-[11px] text-slate-500">Last 7d</div>
                              <div className="mt-0.5 font-semibold text-slate-50">
                                {ownerAnalytics.funnel7.paidRate == null ? '—' : `${Math.round(ownerAnalytics.funnel7.paidRate * 100)}%`}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {ownerAnalytics.funnel7.paidCount}/{ownerAnalytics.funnel7.created} paid
                              </div>
                            </div>
                            <div className="rounded-lg border border-slate-800 bg-slate-950/20 px-2.5 py-2">
                              <div className="text-[11px] text-slate-500">Last 30d</div>
                              <div className="mt-0.5 font-semibold text-slate-50">
                                {ownerAnalytics.funnel30.paidRate == null ? '—' : `${Math.round(ownerAnalytics.funnel30.paidRate * 100)}%`}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {ownerAnalytics.funnel30.paidCount}/{ownerAnalytics.funnel30.created} paid
                              </div>
                            </div>
                          </div>
                        </div>
                          </div>
                        </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Top instructors (30d)</div>
                      {ownerAnalytics.topInstructorsLast30.length === 0 ? (
                        <p className="mt-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                          No paid bookings in the last 30 days.
                        </p>
                      ) : (
                        <ul className="mt-2 flex flex-col gap-2">
                          {ownerAnalytics.topInstructorsLast30.slice(0, 8).map((i) => (
                            <li key={i.id}>
                              <StatRow
                                label={i.name}
                                value={formatCents(i.grossCents, currency)}
                                helper={`${i.paidCount} paid · ${i.uniqueClients} clients${i.cancelRate == null ? '' : ` · ${Math.round(i.cancelRate * 100)}% cancels`}`}
                                onClick={() => setOpenSheet('instructors')}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Classes (30d)</div>
                      <div className="mt-2 grid grid-cols-1 gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Highest earning</div>
                          {ownerAnalytics.topClassesLast30.length === 0 ? (
                            <p className="mt-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                              No paid bookings in the last 30 days.
                            </p>
                          ) : (
                            <ul className="mt-2 flex flex-col gap-2">
                              {ownerAnalytics.topClassesLast30.slice(0, 5).map((t) => (
                                <li key={t.id}>
                                  <StatRow
                                    label={t.title}
                                    value={formatCents(t.grossCents, currency)}
                                    helper={`${t.paidCount} paid · ${t.uniqueClients} clients`}
                                    onClick={() => setOpenSheet('classes')}
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Lowest earning</div>
                          {ownerAnalytics.bottomClassesLast30.length === 0 ? (
                            <p className="mt-2 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                              Not enough paid bookings to compare.
                            </p>
                          ) : (
                            <ul className="mt-2 flex flex-col gap-2">
                              {ownerAnalytics.bottomClassesLast30.slice(0, 5).map((t) => (
                                <li key={t.id}>
                                  <StatRow
                                    label={t.title}
                                    value={formatCents(t.grossCents, currency)}
                                    helper={`${t.paidCount} paid`}
                                    onClick={() => setOpenSheet('classes')}
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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

      {ownerLike && !!openSheet && ownerAnalytics && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Analytics details">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            aria-label="Close analytics details"
            onClick={() => setOpenSheet('')}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(92vw,34rem)] flex-col border-l border-slate-800 bg-slate-950/95 shadow-xl shadow-black/50">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Analytics</div>
                <div className="mt-1 text-sm font-semibold text-slate-50">
                  {openSheet === 'revenue' ? 'Revenue trends'
                    : openSheet === 'sessions' ? 'Session demand'
                      : openSheet === 'funnel' ? 'Booking funnel'
                        : openSheet === 'retention' ? 'Client retention'
                          : openSheet === 'instructors' ? 'Instructor performance'
                            : openSheet === 'classes' ? 'Classes'
                              : 'Details'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/analytics#${openSheet}`}
                  className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  View full
                </Link>
                <button
                  type="button"
                  onClick={() => setOpenSheet('')}
                  className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {openSheet === 'revenue' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatCard
                      label="Paid revenue (30d)"
                      value={formatCents(ownerAnalytics.paidLast30GrossCents, currency)}
                      helper={`${ownerAnalytics.paidLast30Count} paid bookings`}
                    />
                    <StatCard
                      label="This week vs last"
                      value={ownerAnalytics.weekDelta ? formatCents(ownerAnalytics.weekDelta.changeCents, currency) : '—'}
                      helper={ownerAnalytics.weekDelta?.changePct == null ? '—' : `${Math.round(ownerAnalytics.weekDelta.changePct * 100)}%`}
                    />
                    <StatCard
                      label="Paid revenue (90d)"
                      value={formatCents(ownerAnalytics.paidLast90GrossCents, currency)}
                      helper={`${ownerAnalytics.paidLast90Count} paid bookings`}
                    />
                  </div>

                  <div className="overflow-auto rounded-xl border border-slate-800">
                    <table className="min-w-full text-left text-sm text-slate-200">
                      <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Week</th>
                          <th className="px-3 py-2">Paid</th>
                          <th className="px-3 py-2">Gross</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownerAnalytics.weekBuckets.map((w) => (
                          <tr key={w.weekStart.toISOString()} className="border-t border-slate-800">
                            <td className="px-3 py-2 text-xs text-slate-300">
                              {formatShortDate(w.weekStart)}–{formatShortDate(addDays(w.weekStart, 6))}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-300">{w.paidCount}</td>
                            <td className="px-3 py-2 text-sm font-semibold text-slate-100">
                              {formatCents(w.grossCents, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {openSheet === 'sessions' && (
                <div className="space-y-3">
                  {upcoming7ForDemand.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                      No upcoming sessions in the next 7 days.
                    </div>
                  ) : (
                    <div className="overflow-auto rounded-xl border border-slate-800">
                      <table className="min-w-full text-left text-sm text-slate-200">
                        <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Start</th>
                            <th className="px-3 py-2">Class</th>
                            <th className="px-3 py-2">Fill</th>
                          </tr>
                        </thead>
                        <tbody>
                          {upcoming7ForDemand.map((s) => {
                            const cap = typeof s.capacity === 'number' ? s.capacity : null
                            const seats = typeof s.seatsAvailable === 'number' ? s.seatsAvailable : null
                            const fill = (cap != null && seats != null && cap > 0)
                              ? Math.max(0, Math.min(1, (cap - seats) / cap))
                              : null
                            return (
                              <tr key={s.id} className="border-t border-slate-800">
                                <td className="px-3 py-2 text-xs text-slate-300">{new Date(s.startTime).toLocaleString()}</td>
                                <td className="px-3 py-2 text-sm text-slate-50">{s.classTemplate?.title || 'Class'}</td>
                                <td className="px-3 py-2 text-xs font-semibold text-slate-100">
                                  {fill == null ? '—' : `${Math.round(fill * 100)}%`}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {openSheet === 'funnel' && (
                <div className="grid grid-cols-1 gap-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Last 7 days</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <StatRow label="Created" value={ownerAnalytics.funnel7.created} />
                      <StatRow label="Paid" value={ownerAnalytics.funnel7.paidCount} />
                      <StatRow label="Unpaid" value={ownerAnalytics.funnel7.unpaid} />
                      <StatRow label="Cancelled" value={ownerAnalytics.funnel7.cancelled} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Last 30 days</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <StatRow label="Created" value={ownerAnalytics.funnel30.created} />
                      <StatRow label="Paid" value={ownerAnalytics.funnel30.paidCount} />
                      <StatRow label="Unpaid" value={ownerAnalytics.funnel30.unpaid} />
                      <StatRow label="Cancelled" value={ownerAnalytics.funnel30.cancelled} />
                    </div>
                  </div>
                </div>
              )}

              {openSheet === 'retention' && (
                <div className="space-y-3">
                  {!ownerAnalytics.clientCohorts ? (
                    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                      Not enough data to compute retention.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      <StatRow label="Total clients" value={ownerAnalytics.clientCohorts.clientsTotal} />
                      <StatRow label="Active (30d)" value={ownerAnalytics.clientCohorts.activeLast30Count} helper={`${ownerAnalytics.clientCohorts.newLast30Count} new`} />
                      <StatRow label="Dropped (31–90d)" value={ownerAnalytics.clientCohorts.dropoff31to90Count} />
                      <StatRow
                        label="Repeat rate (90d)"
                        value={ownerAnalytics.clientCohorts.repeatRate90 == null
                          ? '—'
                          : `${Math.round(ownerAnalytics.clientCohorts.repeatRate90 * 100)}%`}
                        helper={`${ownerAnalytics.clientCohorts.returningLast90Count} repeat clients`}
                      />
                      <StatRow
                        label="Avg paid bookings / active client (30d)"
                        value={ownerAnalytics.clientCohorts.avgPaidBookingsPerActive30 == null
                          ? '—'
                          : ownerAnalytics.clientCohorts.avgPaidBookingsPerActive30.toFixed(1)}
                      />
                    </div>
                  )}
                </div>
              )}

              {openSheet === 'instructors' && (
                <div className="space-y-3">
                  {ownerAnalytics.topInstructorsLast30.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                      No paid bookings in the last 30 days.
                    </div>
                  ) : (
                    <div className="overflow-auto rounded-xl border border-slate-800">
                      <table className="min-w-full text-left text-sm text-slate-200">
                        <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Instructor</th>
                            <th className="px-3 py-2">Paid</th>
                            <th className="px-3 py-2">Clients</th>
                            <th className="px-3 py-2">Gross</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ownerAnalytics.topInstructorsLast30.map((i) => (
                            <tr key={i.id} className="border-t border-slate-800">
                              <td className="px-3 py-2 text-sm text-slate-50">{i.name}</td>
                              <td className="px-3 py-2 text-xs text-slate-300">{i.paidCount}</td>
                              <td className="px-3 py-2 text-xs text-slate-300">{i.uniqueClients}</td>
                              <td className="px-3 py-2 text-sm font-semibold text-slate-100">{formatCents(i.grossCents, currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {openSheet === 'classes' && (
                <div className="space-y-3">
                  {ownerAnalytics.topClassesLast30.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                      No paid bookings in the last 30 days.
                    </div>
                  ) : (
                    <div className="overflow-auto rounded-xl border border-slate-800">
                      <table className="min-w-full text-left text-sm text-slate-200">
                        <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Class</th>
                            <th className="px-3 py-2">Paid</th>
                            <th className="px-3 py-2">Clients</th>
                            <th className="px-3 py-2">Gross</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ownerAnalytics.topClassesLast30.map((t) => (
                            <tr key={t.id} className="border-t border-slate-800">
                              <td className="px-3 py-2 text-sm text-slate-50">{t.title}</td>
                              <td className="px-3 py-2 text-xs text-slate-300">{t.paidCount}</td>
                              <td className="px-3 py-2 text-xs text-slate-300">{t.uniqueClients}</td>
                              <td className="px-3 py-2 text-sm font-semibold text-slate-100">{formatCents(t.grossCents, currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
