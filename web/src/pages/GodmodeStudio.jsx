import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { useAuth } from '../auth/AuthProvider'
import { ALL_USERS, BOOKINGS, STUDIOS } from '../apollo/queries'

function centsToMoney(cents) {
  const n = Number(cents || 0)
  return (n / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

export default function GodmodeStudio() {
  const { studioId } = useParams()
  const auth = useAuth()
  const user = auth.user

  const roleName = (user?.roleName || '').toString().toLowerCase()
  const isGodmode = user?.godmode === true || roleName === 'godmode'

  const canView = !!user && isGodmode && !auth.isImpersonating && !!studioId

  const { data: studiosData } = useQuery(STUDIOS, { fetchPolicy: 'cache-first', skip: !canView })
  const { data: usersData, loading: usersLoading } = useQuery(ALL_USERS, { fetchPolicy: 'cache-and-network', skip: !canView })
  const { data: bookingsData, loading: bookingsLoading } = useQuery(BOOKINGS, {
    variables: { studioId, studioLocationId: null },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    skip: !canView,
  })

  const studioName = studiosData?.studios?.find((s) => (s.id || '').toString() === (studioId || '').toString())?.name || (studioId ? `Studio ${studioId}` : 'Studio')

  const allUsers = useMemo(() => usersData?.users || [], [usersData])

  const roleCounts = useMemo(() => {
    const studioUsers = canView
      ? allUsers.filter((u) => (u?.studioId || '').toString() === (studioId || '').toString())
      : []
    const counts = { owner: 0, staff: 0, instructor: 0, client: 0, other: 0 }
    for (const u of studioUsers) {
      const rn = (u?.roleName || '').toString().toLowerCase()
      if (rn === 'owner' || u?.role === 0) counts.owner += 1
      else if (rn === 'staff' || u?.role === 1) counts.staff += 1
      else if (rn === 'instructor' || u?.role === 2) counts.instructor += 1
      else if (rn === 'client' || u?.role === 3) counts.client += 1
      else counts.other += 1
    }
    return counts
  }, [allUsers, canView, studioId])

  const bookingStats = useMemo(() => {
    const bookings = bookingsData?.bookings || []
    const stats = {
      total: bookings.length,
      paid: 0,
      cancelled: 0,
      revenueCents: 0,
      paymentCents: 0,
    }

    for (const b of bookings) {
      const status = (b?.status || '').toString().toLowerCase()
      if (status === 'cancelled') stats.cancelled += 1

      if (b?.paid) {
        stats.paid += 1
        stats.revenueCents += Number(b?.priceCents || 0)
        stats.paymentCents += Number(b?.payment?.amountCents || 0)
      }
    }

    return stats
  }, [bookingsData])

  if (!user) return <Navigate to="/signin" replace />
  if (!isGodmode || auth.isImpersonating) return <Navigate to="/owner" replace />
  if (!studioId) return <Navigate to="/owner" replace />

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">{studioName}</h1>
        <p className="text-sm text-slate-400">Studio summary (Godmode)</p>
        <div className="text-xs text-slate-500">ID {studioId}</div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">Users</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="text-slate-300">Owners</div>
            <div className="text-right text-slate-100">{usersLoading ? '…' : roleCounts.owner}</div>
            <div className="text-slate-300">Staff</div>
            <div className="text-right text-slate-100">{usersLoading ? '…' : roleCounts.staff}</div>
            <div className="text-slate-300">Instructors</div>
            <div className="text-right text-slate-100">{usersLoading ? '…' : roleCounts.instructor}</div>
            <div className="text-slate-300">Clients</div>
            <div className="text-right text-slate-100">{usersLoading ? '…' : roleCounts.client}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">Bookings</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="text-slate-300">Total</div>
            <div className="text-right text-slate-100">{bookingsLoading ? '…' : bookingStats.total}</div>
            <div className="text-slate-300">Paid</div>
            <div className="text-right text-slate-100">{bookingsLoading ? '…' : bookingStats.paid}</div>
            <div className="text-slate-300">Cancelled</div>
            <div className="text-right text-slate-100">{bookingsLoading ? '…' : bookingStats.cancelled}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-400">Revenue</div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-300">Booked (paid)</span>
              <span className="text-slate-100">{bookingsLoading ? '…' : centsToMoney(bookingStats.revenueCents)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-300">Payments (paid)</span>
              <span className="text-slate-100">{bookingsLoading ? '…' : centsToMoney(bookingStats.paymentCents)}</span>
            </div>
            <div className="text-xs text-slate-500">(Uses booking price and attached payment amounts where available.)</div>
          </div>
        </div>
      </section>
    </div>
  )
}
