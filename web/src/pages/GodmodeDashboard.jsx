import { Navigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { useAuth } from '../auth/AuthProvider'
import { PLATFORM_STATS } from '../apollo/queries'

function fmt(cents) {
  if (cents == null) return '—'
  const dollars = cents / 100
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(dollars)
}

function num(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat().format(n)
}

function StatCard({ label, value, sub, accent }) {
  const accentMap = {
    violet: 'border-violet-800/60 bg-violet-950/20',
    emerald: 'border-emerald-800/60 bg-emerald-950/20',
    sky: 'border-sky-800/60 bg-sky-950/20',
    amber: 'border-amber-800/60 bg-amber-950/20',
    rose: 'border-rose-800/60 bg-rose-950/20',
    slate: 'border-slate-700 bg-slate-900/60',
  }
  const labelMap = {
    violet: 'text-violet-400',
    emerald: 'text-emerald-400',
    sky: 'text-sky-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    slate: 'text-slate-400',
  }

  return (
    <div className={`flex flex-col gap-1.5 rounded-2xl border p-5 shadow-sm shadow-black/20 ${accentMap[accent] || accentMap.slate}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-[0.25em] ${labelMap[accent] || labelMap.slate}`}>
        {label}
      </div>
      <div className="text-3xl font-bold tracking-tight text-slate-50">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

function TierRow({ tier, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const colors = {
    premium: { bar: 'bg-purple-500', label: 'text-purple-300', badge: 'border-purple-700 bg-purple-950/40 text-purple-300' },
    basic:   { bar: 'bg-sky-500',    label: 'text-sky-300',    badge: 'border-sky-700 bg-sky-950/40 text-sky-300' },
  }
  const c = colors[tier] || { bar: 'bg-slate-500', label: 'text-slate-300', badge: 'border-slate-600 bg-slate-900 text-slate-400' }

  return (
    <div className="flex items-center gap-3">
      <span className={`w-20 shrink-0 rounded-full border px-2 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide ${c.badge}`}>
        {tier}
      </span>
      <div className="flex-1 overflow-hidden rounded-full bg-slate-800 h-2">
        <div className={`h-2 rounded-full ${c.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-sm font-semibold text-slate-300">{count}</span>
      <span className="w-8 text-right text-xs text-slate-500">{pct}%</span>
    </div>
  )
}

export default function GodmodeDashboard() {
  const { user, isImpersonating } = useAuth()

  const roleName = (user?.roleName || '').toString().toLowerCase()
  const isGodmode = user?.godmode === true || roleName === 'godmode'

  const { data, loading } = useQuery(PLATFORM_STATS, {
    fetchPolicy: 'cache-and-network',
    skip: !isGodmode,
    pollInterval: 60_000,
  })

  if (!user) return <Navigate to="/signin" replace />
  if (!isGodmode || isImpersonating) return <Navigate to="/dashboard" replace />

  const s = data?.platformStats
  const tierEntries = s?.subscriptionsByTier ? Object.entries(s.subscriptionsByTier) : []
  const totalSubsByTier = tierEntries.reduce((acc, [, n]) => acc + n, 0)

  const bookingConfirmRate =
    s?.totalBookingsCount > 0
      ? Math.round((s.confirmedBookingsCount / s.totalBookingsCount) * 100)
      : null

  return (
    <div className="flex w-full flex-col gap-8 p-1">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Platform Analytics</h1>
          <span className="rounded-full border border-violet-700/60 bg-violet-950/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-violet-400">
            Godmode
          </span>
          {loading && (
            <span className="text-xs text-slate-500">Refreshing…</span>
          )}
        </div>
        <p className="text-sm text-slate-400">
          Live aggregate metrics across the entire StudioFlow platform.
        </p>
      </header>

      {/* Revenue highlight */}
      <section className="rounded-2xl border border-emerald-800/50 bg-gradient-to-br from-emerald-950/40 to-slate-900/60 p-6 shadow-sm shadow-black/30">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400 mb-1">
          Total Platform Revenue
        </div>
        <div className="text-5xl font-bold tracking-tight text-slate-50">
          {loading ? <span className="text-slate-500 text-3xl">Loading…</span> : fmt(s?.totalRevenueCents)}
        </div>
        <div className="mt-1.5 text-xs text-slate-500">
          {loading ? '' : `${num(s?.totalPaymentsCount)} successful payment${s?.totalPaymentsCount === 1 ? '' : 's'}`}
        </div>
      </section>

      {/* Studio + subscription grid */}
      <div>
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Studios</div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Studios"
            value={loading ? '…' : num(s?.studiosCount)}
            sub={loading || !s ? '' : `${num(s.newStudiosThisMonth)} new this month`}
            accent="violet"
          />
          <StatCard
            label="Active Subscriptions"
            value={loading ? '…' : num(s?.activeSubscriptionsCount)}
            sub="status = active"
            accent="emerald"
          />
          <StatCard
            label="Total Users"
            value={loading ? '…' : num(s?.totalUsersCount)}
            accent="sky"
          />
          <StatCard
            label="Total Clients"
            value={loading ? '…' : num(s?.totalClientsCount)}
            accent="sky"
          />
        </div>
      </div>

      {/* Booking + payment grid */}
      <div>
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Bookings & Payments</div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Bookings"
            value={loading ? '…' : num(s?.totalBookingsCount)}
            accent="amber"
          />
          <StatCard
            label="Confirmed Bookings"
            value={loading ? '…' : num(s?.confirmedBookingsCount)}
            sub={bookingConfirmRate != null ? `${bookingConfirmRate}% confirmation rate` : ''}
            accent="emerald"
          />
          <StatCard
            label="Successful Payments"
            value={loading ? '…' : num(s?.totalPaymentsCount)}
            accent="slate"
          />
        </div>
      </div>

      {/* Subscription tier breakdown */}
      {(tierEntries.length > 0 || loading) && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm shadow-black/20">
          <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
            Subscriptions by Tier
          </div>
          {loading ? (
            <div className="py-4 text-sm text-slate-500">Loading…</div>
          ) : (
            <div className="flex flex-col gap-3">
              {tierEntries
                .sort((a, b) => b[1] - a[1])
                .map(([tier, count]) => (
                  <TierRow key={tier} tier={tier} count={count} total={totalSubsByTier} />
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
