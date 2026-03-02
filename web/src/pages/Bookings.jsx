import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Link, useNavigate } from 'react-router-dom'
import { BOOKINGS, MY_BOOKINGS } from '../apollo/queries'
import { CANCEL_BOOKING, ARCHIVE_BOOKING } from '../apollo/mutations'
import { useToast } from '../components/ToastProvider'
import { useLocationContext } from '../location/LocationProvider'
import { useStudio } from '../studio/StudioProvider'
import { useAuth } from '../auth/AuthProvider'

const EMPTY_BOOKINGS = []

export default function BookingsPage({ scope = 'visible' }) {
  const { user } = useAuth()
  const role = (user?.roleName || '').toString().toLowerCase()
  const isClient = role === 'client'
  const isInstructor = role === 'instructor'
  const isOwner = role === 'owner' || user?.role === 0

  const { locationId } = useLocationContext()
  const { selectedStudioId } = useStudio()
  const effectiveScope = isClient ? 'mine' : scope
  const query = effectiveScope === 'mine' ? MY_BOOKINGS : BOOKINGS
  const variables = useMemo(() => {
    const base = { studioLocationId: locationId || null }
    if (isClient) return { ...base, studioId: selectedStudioId }
    return base
  }, [isClient, locationId, selectedStudioId])

  const { data, loading, refetch } = useQuery(query, {
    variables,
    skip: isClient && !selectedStudioId,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  })
  const navigate = useNavigate()
  const [cancelBooking] = useMutation(CANCEL_BOOKING)
  const [archiveBooking] = useMutation(ARCHIVE_BOOKING)
  const { addToast } = useToast()

  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const bookings = effectiveScope === 'mine' ? data?.myBookings : data?.bookings
  const bookingsList = bookings || EMPTY_BOOKINGS

  const filteredBookings = useMemo(() => {
    const term = search.trim().toLowerCase()
    const from = fromDate ? new Date(fromDate) : null
    const to = toDate ? new Date(toDate) : null

    return bookingsList.filter((b) => {
      const start = new Date(b.classSession.startTime)

      if (statusFilter && b.status !== statusFilter) return false

      if (from && start < from) return false
      if (to) {
        const endOfDay = new Date(to)
        endOfDay.setHours(23, 59, 59, 999)
        if (start > endOfDay) return false
      }

      if (!term) return true

      const haystack = [
        b.client?.name,
        b.client?.email,
        b.classSession?.classTemplate?.title,
        b.classSession?.instructor?.name,
        b.classSession?.room,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(term)
    })
  }, [bookingsList, statusFilter, search, fromDate, toDate])

  const instructorDayView = isInstructor && effectiveScope !== 'mine'

  const groupedForInstructor = useMemo(() => {
    if (!instructorDayView) return []

    const dayKeyFor = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dd}`
    }

    const today = new Date()
    const todayKey = dayKeyFor(today)

    const sessionMap = new Map()
    filteredBookings.forEach((b) => {
      const session = b?.classSession
      if (!session?.id) return
      const key = session.id
      const existing = sessionMap.get(key)
      if (existing) {
        existing.bookings.push(b)
      } else {
        sessionMap.set(key, { session, bookings: [b] })
      }
    })

    const statusRank = (s) => {
      if (s === 'booked') return 0
      if (s === 'waitlisted') return 1
      if (s === 'cancelled') return 2
      return 3
    }

    const sessions = Array.from(sessionMap.values()).map((entry) => {
      const start = new Date(entry.session.startTime)
      const dayKey = dayKeyFor(start)
      const sortedBookings = [...entry.bookings].sort((a, b) => {
        const ar = statusRank(a.status)
        const br = statusRank(b.status)
        if (ar !== br) return ar - br
        const an = (a.client?.name || '').toString()
        const bn = (b.client?.name || '').toString()
        return an.localeCompare(bn)
      })
      return { ...entry, start, dayKey, bookings: sortedBookings }
    })

    sessions.sort((a, b) => a.start - b.start)

    const byDay = new Map()
    sessions.forEach((s) => {
      const list = byDay.get(s.dayKey) || []
      list.push(s)
      byDay.set(s.dayKey, list)
    })

    const keys = Array.from(byDay.keys())
    const futureOrToday = keys.filter((k) => k >= todayKey).sort()
    const past = keys.filter((k) => k < todayKey).sort().reverse()
    const orderedKeys = [...futureOrToday, ...past]

    const prettyLabel = (dayKey) => {
      if (dayKey === todayKey) return 'Today'
      const [y, m, d] = dayKey.split('-').map((n) => parseInt(n, 10))
      const dt = new Date(y, m - 1, d)
      return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    }

    return orderedKeys.map((dayKey) => ({
      dayKey,
      label: prettyLabel(dayKey),
      sessions: byDay.get(dayKey) || [],
      isToday: dayKey === todayKey,
    }))
  }, [filteredBookings, instructorDayView])

  const handleCancel = async (id) => {
    try {
      const res = await cancelBooking({ variables: { id } })
      const payload = res.data?.cancelBooking
      if (!payload?.success) {
        addToast({ message: (payload?.errors || ['Could not cancel booking']).join(', '), type: 'error' })
      } else {
        addToast({ message: 'Booking cancelled', type: 'success' })
        refetch()
      }
    } catch (e) {
      addToast({ message: e.message || 'Failed to cancel booking', type: 'error' })
    }
  }

  const handleArchive = async (id) => {
    try {
      const res = await archiveBooking({ variables: { id } })
      const payload = res.data?.archiveBooking
      if (!payload?.success) {
        addToast({ message: (payload?.errors || ['Could not archive booking']).join(', '), type: 'error' })
      } else {
        addToast({ message: 'Booking archived', type: 'success' })
        refetch()
      }
    } catch (e) {
      addToast({ message: e.message || 'Failed to archive booking', type: 'error' })
    }
  }
  const title = effectiveScope === 'mine'
    ? (isClient ? 'Bookings' : 'My bookings')
    : isClient
      ? 'Bookings'
      : 'Bookings'
  const subtitle = effectiveScope === 'mine'
    ? (isClient
      ? 'These are the classes you are booked into.'
      : 'Classes you are personally booked into.')
    : isInstructor
      ? 'Bookings for your upcoming classes.'
      : 'All studio bookings across classes and clients.'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">{title}</h1>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </header>

      {loading && <p className="text-sm text-slate-400">Loading bookings…</p>}

      {!loading && bookingsList.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">
          No bookings to show.
        </p>
      )}

      {!loading && bookingsList.length > 0 && instructorDayView && (
        <div className="space-y-3">
          {groupedForInstructor.map((group) => (
            <section
              key={group.dayKey}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-[0.22em] uppercase text-slate-300">
                  {group.label}
                </h2>
              </div>

              {group.sessions.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">No bookings.</p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {group.sessions.map(({ session, bookings: attendees }) => {
                    const title = session.classTemplate?.title || 'Class'
                    const templateId = session.classTemplate?.id
                    const startLabel = new Date(session.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                    const bookedCount = attendees.filter((b) => b.status === 'booked').length
                    const waitlistCount = attendees.filter((b) => b.status === 'waitlisted').length

                    return (
                      <details
                        key={session.id}
                        open={group.isToday}
                        className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5"
                      >
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-slate-50">
                                {startLabel} • {title}
                              </span>
                              {session.room && (
                                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300">
                                  Room {session.room}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {bookedCount} booked{waitlistCount ? ` • ${waitlistCount} waitlisted` : ''}
                            </div>
                          </div>
                          {templateId ? (
                            <Link
                              to={`/templates/${templateId}/sessions`}
                              className="rounded-full border border-slate-600 px-3 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-800"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Modify session
                            </Link>
                          ) : null}
                        </summary>

                        <div className="mt-3 flex flex-col gap-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            Attendees
                          </div>
                          <ul className="flex flex-col gap-1">
                            {attendees.map((b) => {
                              const paid = b.paid || b.payment?.status === 'succeeded'
                              return (
                                <li
                                  key={b.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2 text-xs"
                                >
                                  <div className="flex min-w-[180px] flex-1 flex-col">
                                    <Link
                                      to={`/bookings/${b.id}`}
                                      className="font-medium text-slate-200 hover:text-sky-300"
                                    >
                                      {b.client?.name || b.client?.email || 'Client'}
                                    </Link>
                                    {b.client?.email && (
                                      <span className="text-[11px] text-slate-500">{b.client.email}</span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${
                                        b.status === 'cancelled'
                                          ? 'bg-rose-900/60 text-rose-200'
                                          : b.status === 'waitlisted'
                                            ? 'bg-amber-800/60 text-amber-100'
                                            : 'bg-emerald-900/60 text-emerald-100'
                                      }`}
                                    >
                                      {b.status}
                                    </span>

                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${
                                        paid ? 'bg-emerald-900/40 text-emerald-100' : 'bg-slate-800 text-slate-200'
                                      }`}
                                    >
                                      {paid ? 'Paid' : 'Unpaid'}
                                    </span>

                                    {b.status !== 'cancelled' && (
                                      <button
                                        type="button"
                                        onClick={() => handleCancel(b.id)}
                                        className="rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-100 hover:bg-rose-600/80 hover:text-rose-50"
                                      >
                                        Cancel
                                      </button>
                                    )}
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </details>
                    )
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {!loading && bookingsList.length > 0 && !instructorDayView && (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] font-medium text-slate-300">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client, class, instructor…"
                className="mt-0.5 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="min-w-[120px]">
              <label className="block text-[11px] font-medium text-slate-300">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-0.5 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">All</option>
                <option value="booked">Booked</option>
                <option value="waitlisted">Waitlisted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="min-w-[120px]">
              <label className="block text-[11px] font-medium text-slate-300">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-0.5 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="min-w-[120px]">
              <label className="block text-[11px] font-medium text-slate-300">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-0.5 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('')
                setSearch('')
                setFromDate('')
                setToDate('')
              }}
              className="mt-4 inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-800"
            >
              Clear filters
            </button>
          </div>

          <ul className="flex max-h-[480px] flex-col gap-2 overflow-auto text-sm">
            {filteredBookings.map((b) => (
              <li
                key={b.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5"
              >
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/bookings/${b.id}`}
                      className="text-sm font-medium text-slate-50 hover:text-sky-300"
                    >
                      {b.classSession.classTemplate?.title || 'Class'}
                    </Link>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] ${
                        b.status === 'cancelled'
                          ? 'bg-rose-900/60 text-rose-200'
                          : b.status === 'waitlisted'
                            ? 'bg-amber-800/60 text-amber-100'
                            : 'bg-emerald-900/60 text-emerald-100'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(b.classSession.startTime).toLocaleString()}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                    <span>Client: {b.client.name}</span>
                    {b.classSession.instructor && (
                      <span>Instructor: {b.classSession.instructor.name}</span>
                    )}
                    {b.classSession.room && <span>Room: {b.classSession.room}</span>}
                    {b.payment && (
                      <span>
                        Payment: {b.payment.status === 'succeeded' ? 'Paid' : b.payment.status}{' '}
                        ${(b.payment.amountCents / 100).toFixed(2)} {b.payment.currency.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <Link
                    to={`/bookings/${b.id}`}
                    className="rounded-full border border-slate-600 px-3 py-1 text-slate-200 hover:bg-slate-800"
                  >
                    View
                  </Link>
                  {(isOwner || isInstructor) && b.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => handleCancel(b.id)}
                      className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-100 hover:bg-rose-600/80 hover:text-rose-50"
                    >
                      Cancel
                    </button>
                  )}
                  {(isOwner || isInstructor) && b.status === 'cancelled' && !b.archived && (
                    <div className="flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/bookings/${b.id}?rebook=1`)}
                        className="rounded-full bg-emerald-700/80 px-3 py-1 text-xs text-emerald-50 hover:bg-emerald-500"
                      >
                        Re-book
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(b.id)}
                        className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-100 hover:bg-slate-700"
                      >
                        Archive
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
