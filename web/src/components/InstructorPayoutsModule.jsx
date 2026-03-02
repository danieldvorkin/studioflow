import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { ALL_USERS, CLASS_TEMPLATES, INSTRUCTOR_EARNINGS_WEEKS } from '../apollo/queries'
import {
  CREATE_INSTRUCTOR_CONNECT_ONBOARDING,
  CREATE_INSTRUCTOR_PAYOUT,
  MARK_INSTRUCTOR_PAYOUT_PAID,
  PAY_INSTRUCTOR_PAYOUT,
  REFRESH_INSTRUCTOR_CONNECT_STATUS,
  UPDATE_CLASS_TEMPLATE,
  UPDATE_USER,
} from '../apollo/mutations'

function formatMoney(cents, currency) {
  const amount = (Number(cents) || 0) / 100
  const c = (currency || 'cad').toString().toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(amount)
  } catch {
    return `${c} ${amount.toFixed(2)}`
  }
}

function toISODate(d) {
  if (!d) return ''
  const date = (d instanceof Date) ? d : new Date(d)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function beginningOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay() // 0 Sun
  const diff = (day === 0 ? -6 : 1) - day // shift to Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function StatusPill({ tone, children }) {
  const classes = {
    slate: 'bg-slate-800 text-slate-300',
    amber: 'bg-amber-500/10 text-amber-300',
    emerald: 'bg-emerald-500/10 text-emerald-300',
    sky: 'bg-sky-500/10 text-sky-300',
    rose: 'bg-rose-500/10 text-rose-300',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${classes[tone] || classes.slate}`}>
      {children}
    </span>
  )
}

async function copyText(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    try {
      document.execCommand('copy')
    } finally {
      document.body.removeChild(el)
    }
  }
}

function EarningsCard({
  row,
  addToast,
  createPayout,
  payPayout,
  markPayoutPaid,
  createConnectOnboarding,
  refreshConnectStatus,
  onAfterMutation,
}) {
  const instructor = row.instructor
  const payout = row.existingPayout
  const connectId = instructor?.stripeConnectAccountId
  const connectOk = !!instructor?.stripeConnectOnboardingCompleted

  const [showDetails, setShowDetails] = useState(false)
  const [showMarkPaid, setShowMarkPaid] = useState(false)
  const [paidForm, setPaidForm] = useState({ method: '', reference: '', notes: '' })
  const [onboardingUrl, setOnboardingUrl] = useState(null)

  const payoutTone = payout?.status === 'paid' ? 'emerald' : (payout ? 'amber' : 'slate')

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-semibold text-slate-50">{instructor?.name || instructor?.email || 'Instructor'}</div>
            <StatusPill tone="sky">{(row.currency || 'cad').toString().toUpperCase()}</StatusPill>
            <StatusPill tone={payoutTone}>{payout ? payout.status : 'no payout'}</StatusPill>
          </div>
          {instructor?.email && <div className="mt-0.5 truncate text-xs text-slate-500">{instructor.email}</div>}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Gross</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-100">{formatMoney(row.grossCents, row.currency)}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Instructor</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-50">{formatMoney(row.instructorEarningsCents, row.currency)}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Studio</div>
          <div className="mt-0.5 text-sm font-semibold text-slate-200">{formatMoney(row.studioCutCents, row.currency)}</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Activity</div>
          <div className="mt-0.5 text-xs text-slate-300">
            {row.paymentsCount} payments · {row.sessionsTaughtCount} sessions
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <section className="rounded-xl border border-slate-800 bg-slate-950/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Payout</h4>
                {payout?.paidAt && (
                  <span className="text-[10px] text-slate-500">paid {new Date(payout.paidAt).toLocaleString()}</span>
                )}
              </div>

              {!payout ? (
                <button
                  type="button"
                  className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-on-accent hover:bg-sky-400"
                  onClick={async () => {
                    try {
                      const res = await createPayout({
                        variables: {
                          instructorId: instructor.id,
                          weekStart: row.weekStart,
                          weekEnd: row.weekEnd,
                          currency: row.currency,
                        },
                      })
                      const payload = res.data?.createInstructorPayout
                      const errors = payload?.errors || []
                      if (errors.length) throw new Error(errors.join(', '))
                      addToast({ message: 'Payout created', type: 'success' })
                      onAfterMutation?.()
                    } catch (err) {
                      addToast({ message: err.message || 'Could not create payout', type: 'error' })
                    }
                  }}
                >
                  Create payout
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-slate-300">
                    Status: <span className="text-slate-100">{payout.status}</span>
                    {payout.paidMethod && (
                      <>
                        {' · '}via <span className="text-slate-100">{payout.paidMethod}</span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!(connectId && connectOk) || payout.status === 'paid'}
                      title={connectId
                        ? (connectOk ? 'Pay via Stripe transfer' : 'Stripe account not ready (onboarding incomplete)')
                        : 'No Stripe connected account on file for this instructor'}
                      className={(connectId && connectOk && payout.status !== 'paid')
                        ? 'rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25'
                        : 'rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-500 opacity-70 cursor-not-allowed'
                      }
                      onClick={async () => {
                        try {
                          const res = await payPayout({ variables: { id: payout.id } })
                          const payload = res.data?.payInstructorPayout
                          const errors = payload?.errors || []
                          if (errors.length) throw new Error(errors.join(', '))
                          addToast({ message: 'Stripe payout initiated', type: 'success' })
                          onAfterMutation?.()
                        } catch (err) {
                          addToast({ message: err.message || 'Payout failed', type: 'error' })
                        }
                      }}
                    >
                      Pay via Stripe
                    </button>

                    {payout.status !== 'paid' && (
                      <button
                        type="button"
                        className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
                        onClick={() => setShowMarkPaid((v) => !v)}
                      >
                        {showMarkPaid ? 'Cancel' : 'Mark paid (manual)'}
                      </button>
                    )}
                  </div>

                  {showMarkPaid && payout.status !== 'paid' && (
                    <form
                      className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-slate-950/20 p-3 md:grid-cols-3"
                      onSubmit={async (e) => {
                        e.preventDefault()
                        try {
                          const method = (paidForm.method || '').trim()
                          if (!method) throw new Error('Paid method is required')

                          const res = await markPayoutPaid({
                            variables: {
                              id: payout.id,
                              paidMethod: method,
                              paidReference: (paidForm.reference || '').trim() || null,
                              paidNotes: (paidForm.notes || '').trim() || null,
                            },
                          })
                          const payload = res.data?.markInstructorPayoutPaid
                          const errors = payload?.errors || []
                          if (errors.length) throw new Error(errors.join(', '))
                          addToast({ message: 'Payout marked paid', type: 'success' })
                          setShowMarkPaid(false)
                          setPaidForm({ method: '', reference: '', notes: '' })
                          onAfterMutation?.()
                        } catch (err) {
                          addToast({ message: err.message || 'Update failed', type: 'error' })
                        }
                      }}
                    >
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-300">Method</label>
                        <input
                          value={paidForm.method}
                          onChange={(e) => setPaidForm((v) => ({ ...v, method: e.target.value }))}
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                          placeholder="cash, etransfer, bank_transfer"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-300">Reference (optional)</label>
                        <input
                          value={paidForm.reference}
                          onChange={(e) => setPaidForm((v) => ({ ...v, reference: e.target.value }))}
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-300">Notes (optional)</label>
                        <input
                          value={paidForm.notes}
                          onChange={(e) => setPaidForm((v) => ({ ...v, notes: e.target.value }))}
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                      <div className="md:col-span-3 flex justify-end">
                        <button
                          type="submit"
                          className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-on-accent hover:bg-sky-400"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Stripe Connect</h4>
                <div className="flex items-center gap-2">
                  {connectId ? (
                    <StatusPill tone={connectOk ? 'emerald' : 'amber'}>{connectOk ? 'Connected' : 'Incomplete'}</StatusPill>
                  ) : (
                    <StatusPill tone="slate">Not set</StatusPill>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                {connectId && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-400">
                      acct: <span className="text-slate-200">{connectId}</span>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
                      onClick={async () => {
                        try {
                          const res = await refreshConnectStatus({ variables: { instructorId: instructor.id } })
                          const payload = res.data?.refreshInstructorConnectStatus
                          const errors = payload?.errors || []
                          if (errors.length) throw new Error(errors.join(', '))
                          addToast({ message: 'Stripe status refreshed', type: 'success' })
                          onAfterMutation?.()
                        } catch (err) {
                          addToast({ message: err.message || 'Refresh failed', type: 'error' })
                        }
                      }}
                    >
                      Refresh status
                    </button>
                  </div>
                )}

                {!connectOk && (
                  <div className="text-[11px] text-slate-500">
                    Generate an onboarding link, complete it in Stripe, then refresh status.
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-on-accent hover:bg-sky-400"
                    onClick={async () => {
                      try {
                        const res = await createConnectOnboarding({ variables: { instructorId: instructor.id } })
                        const payload = res.data?.createInstructorConnectOnboarding
                        const errors = payload?.errors || []
                        if (errors.length) throw new Error(errors.join(', '))
                        if (!payload?.onboardingUrl) throw new Error('No onboarding URL returned')
                        setOnboardingUrl(payload.onboardingUrl)
                        addToast({ message: 'Onboarding link created', type: 'success' })
                        onAfterMutation?.()
                      } catch (err) {
                        addToast({ message: err.message || 'Could not create onboarding link', type: 'error' })
                      }
                    }}
                  >
                    {connectId ? 'Get onboarding link' : 'Connect (create account)'}
                  </button>

                  {onboardingUrl && (
                    <>
                      <a
                        href={onboardingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
                      >
                        Open link
                      </a>
                      <button
                        type="button"
                        className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
                        onClick={async () => {
                          await copyText(onboardingUrl)
                          addToast({ message: 'Link copied', type: 'success' })
                        }}
                      >
                        Copy link
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>

          {Array.isArray(row.templateBreakdown) && row.templateBreakdown.length > 0 && (
            <section className="rounded-xl border border-slate-800 bg-slate-950/20 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Breakdown</div>
              <div className="overflow-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-[11px] uppercase tracking-[0.15em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Template</th>
                      <th className="px-3 py-2 text-right">Gross</th>
                      <th className="px-3 py-2 text-right">Instructor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.templateBreakdown.map((b) => (
                      <tr key={b.classTemplate?.id || b.classTemplate?.title} className="border-t border-slate-800">
                        <td className="px-3 py-2 text-slate-50">{b.classTemplate?.title || '—'}</td>
                        <td className="px-3 py-2 text-right text-slate-200">{formatMoney(b.grossCents, row.currency)}</td>
                        <td className="px-3 py-2 text-right text-slate-50">{formatMoney(b.instructorEarningsCents, row.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </article>
  )
}

export default function InstructorPayoutsModule({ addToast }) {
  const [weekStart, setWeekStart] = useState(() => beginningOfWeek(new Date()))
  const [selectedInstructorId, setSelectedInstructorId] = useState('')

  const weekStartISO = useMemo(() => toISODate(weekStart), [weekStart])

  const { data: usersData } = useQuery(ALL_USERS)
  const users = usersData?.users
  const instructors = useMemo(() => {
    const list = users || []
    return list.filter((u) => (u.roleName || '').toLowerCase() === 'instructor' || u.role === 2)
  }, [users])

  const { data: templatesData, loading: templatesLoading, refetch: refetchTemplates } = useQuery(CLASS_TEMPLATES, {
    variables: {},
  })
  const classTemplates = templatesData?.classTemplates || []

  const { data: earningsData, loading: earningsLoading, refetch: refetchEarnings } = useQuery(INSTRUCTOR_EARNINGS_WEEKS, {
    variables: {
      weekStart: weekStartISO,
      instructorId: selectedInstructorId || null,
    },
  })

  const earningsRows = earningsData?.instructorEarningsWeeks

  const [createPayout] = useMutation(CREATE_INSTRUCTOR_PAYOUT)
  const [payPayout] = useMutation(PAY_INSTRUCTOR_PAYOUT)
  const [markPayoutPaid] = useMutation(MARK_INSTRUCTOR_PAYOUT_PAID)
  const [createConnectOnboarding] = useMutation(CREATE_INSTRUCTOR_CONNECT_ONBOARDING)
  const [refreshConnectStatus] = useMutation(REFRESH_INSTRUCTOR_CONNECT_STATUS)
  const [updateUser] = useMutation(UPDATE_USER)
  const [updateClassTemplate] = useMutation(UPDATE_CLASS_TEMPLATE)

  const handlePrevWeek = () => setWeekStart((d) => {
    const next = new Date(d)
    next.setDate(next.getDate() - 7)
    return beginningOfWeek(next)
  })
  const handleNextWeek = () => setWeekStart((d) => {
    const next = new Date(d)
    next.setDate(next.getDate() + 7)
    return beginningOfWeek(next)
  })

  const sortedRows = useMemo(() => {
    const rows = earningsRows ? [...earningsRows] : []
    rows.sort((a, b) => {
      const an = (a.instructor?.name || a.instructor?.email || '').toLowerCase()
      const bn = (b.instructor?.name || b.instructor?.email || '').toLowerCase()
      if (an < bn) return -1
      if (an > bn) return 1
      const ac = (a.currency || '').toLowerCase()
      const bc = (b.currency || '').toLowerCase()
      if (ac < bc) return -1
      if (ac > bc) return 1
      return 0
    })
    return rows
  }, [earningsRows])

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Instructor payouts</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Weekly earnings + payout tracking (owner only).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
          >
            Prev
          </button>
          <input
            type="date"
            value={weekStartISO}
            onChange={(e) => setWeekStart(beginningOfWeek(e.target.value))}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="button"
            onClick={handleNextWeek}
            className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => refetchEarnings()}
            className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-on-accent hover:bg-sky-400"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500">
          Week of <span className="text-slate-200">{weekStartISO}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-slate-400">Instructor</label>
          <select
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            value={selectedInstructorId}
            onChange={(e) => setSelectedInstructorId(e.target.value)}
          >
            <option value="">All</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>{i.name || i.email}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {earningsLoading && <div className="p-3 text-sm text-slate-400">Loading weekly earnings…</div>}
        {!earningsLoading && sortedRows.length === 0 && (
          <div className="p-3 text-sm text-slate-500">No instructors found.</div>
        )}

        {!earningsLoading && sortedRows.length > 0 && (
          <div className="space-y-3">
            {sortedRows.map((row) => (
              <EarningsCard
                key={`${row.instructor?.id}-${row.currency}`}
                row={row}
                addToast={addToast}
                createPayout={createPayout}
                payPayout={payPayout}
                markPayoutPaid={markPayoutPaid}
                createConnectOnboarding={createConnectOnboarding}
                refreshConnectStatus={refreshConnectStatus}
                onAfterMutation={() => refetchEarnings()}
              />
            ))}
          </div>
        )}
      </div>

      <details className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          Compensation settings
          <span className="ml-2 text-[10px] normal-case tracking-normal text-slate-500">(instructor defaults + template overrides)</span>
        </summary>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Instructor defaults</h3>
              <span className="text-[11px] text-slate-500">applies when template overrides are blank</span>
            </div>

            <div className="space-y-2">
              {instructors.length === 0 && <div className="text-sm text-slate-500">No instructors.</div>}

              {instructors.map((i) => (
                <form
                  key={i.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-2"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const fd = new FormData(e.currentTarget)
                    const instructorCompensationType = fd.get('type')?.toString() || null
                    const instructorDefaultSplitPercent = Number(fd.get('splitPercent') || 0)
                    const instructorDefaultFlatRateCents = Number(fd.get('flatRateCents') || 0)
                    const stripeConnectAccountId = (fd.get('stripeConnectAccountId')?.toString() || '').trim() || null

                    try {
                      const res = await updateUser({
                        variables: {
                          id: i.id,
                          instructorCompensationType,
                          instructorDefaultSplitPercent,
                          instructorDefaultFlatRateCents,
                          stripeConnectAccountId,
                        },
                      })
                      const payload = res.data?.updateUser
                      const errors = payload?.errors || []
                      if (errors.length) throw new Error(errors.join(', '))
                      addToast({ message: 'Instructor defaults saved', type: 'success' })
                      refetchEarnings()
                    } catch (err) {
                      addToast({ message: err.message || 'Save failed', type: 'error' })
                    }
                  }}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] text-slate-50">{i.name || i.email}</div>
                      <div className="truncate text-[10px] text-slate-500">{i.email}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <select
                        name="type"
                        defaultValue={i.instructorCompensationType || 'revenue_share'}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="revenue_share">revenue share</option>
                        <option value="flat_rate">flat rate</option>
                      </select>

                      <input
                        name="splitPercent"
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={i.instructorDefaultSplitPercent ?? 50}
                        className="w-20 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        placeholder="%"
                      />

                      <input
                        name="flatRateCents"
                        type="number"
                        min={0}
                        defaultValue={i.instructorDefaultFlatRateCents ?? 0}
                        className="w-28 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        placeholder="cents"
                      />

                      <input
                        name="stripeConnectAccountId"
                        type="text"
                        defaultValue={i.stripeConnectAccountId || ''}
                        className="w-44 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        placeholder="Stripe acct_... (optional)"
                      />

                      <button
                        type="submit"
                        className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </form>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Template overrides</h3>
              <button
                type="button"
                onClick={() => refetchTemplates()}
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300"
              >
                Refresh
              </button>
            </div>

            {templatesLoading && <div className="text-sm text-slate-400">Loading templates…</div>}
            {!templatesLoading && classTemplates.length === 0 && <div className="text-sm text-slate-500">No templates.</div>}

            {!templatesLoading && classTemplates.length > 0 && (
              <div className="max-h-72 overflow-auto rounded-xl border border-slate-800">
                {classTemplates.map((t, idx) => (
                  <form
                    key={t.id}
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const fd = new FormData(e.currentTarget)
                      const compensationType = fd.get('compensationType')?.toString() || null
                      const splitRaw = fd.get('splitPercent')?.toString()
                      const flatRaw = fd.get('flatRateCents')?.toString()
                      const instructorSplitPercent = splitRaw === '' || splitRaw == null ? null : Number(splitRaw)
                      const instructorFlatRateCents = flatRaw === '' || flatRaw == null ? null : Number(flatRaw)

                      try {
                        const res = await updateClassTemplate({
                          variables: {
                            id: t.id,
                            compensationType: compensationType || null,
                            instructorSplitPercent,
                            instructorFlatRateCents,
                          },
                        })
                        const payload = res.data?.updateClassTemplate
                        const errors = payload?.errors || []
                        if (errors.length) throw new Error(errors.join(', '))
                        addToast({ message: 'Template override saved', type: 'success' })
                        refetchTemplates()
                        refetchEarnings()
                      } catch (err) {
                        addToast({ message: err.message || 'Save failed', type: 'error' })
                      }
                    }}
                    className={`grid grid-cols-1 gap-2 p-3 sm:grid-cols-6 sm:items-end ${idx === 0 ? '' : 'border-t border-slate-800'}`}
                  >
                    <div className="sm:col-span-2">
                      <div className="text-xs font-medium text-slate-50">{t.title}</div>
                      <div className="text-[10px] text-slate-500">{formatMoney(t.priceCents, t.currency)} • {(t.currency || 'cad').toUpperCase()}</div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Type</div>
                      <select
                        name="compensationType"
                        defaultValue={t.compensationType || ''}
                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">(default)</option>
                        <option value="revenue_share">revenue share</option>
                        <option value="flat_rate">flat rate</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Split %</div>
                      <input
                        name="splitPercent"
                        defaultValue={t.instructorSplitPercent ?? ''}
                        type="number"
                        min={0}
                        max={100}
                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        placeholder="(default)"
                      />
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Flat (cents)</div>
                      <input
                        name="flatRateCents"
                        defaultValue={t.instructorFlatRateCents ?? ''}
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        placeholder="(default)"
                      />
                    </div>

                    <div className="sm:text-right">
                      <button
                        type="submit"
                        className="w-full rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-sky-400 hover:text-sky-300 sm:w-auto"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  )
}
