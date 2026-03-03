import { useMutation, useQuery } from '@apollo/client'
import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { CURRENT_USER, CLIENT_PROFILE } from '../apollo/queries'
import { CREATE_CLIENT_NOTE, UPDATE_CLIENT } from '../apollo/mutations'
import { useToast } from '../components/ToastProvider'

function safeArray(value) {
  if (Array.isArray(value)) return value
  return []
}

function formatDateTime(dateLike) {
  const d = new Date(dateLike)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export default function ClientProfile() {
  const { id } = useParams()
  const { addToast } = useToast()

  const { data: userData } = useQuery(CURRENT_USER)
  const user = userData?.currentUser
  const role = (user?.roleName || '').toString().toLowerCase()
  const isGodmode = role === 'godmode' || user?.godmode === true
  const isOwner = isGodmode || role === 'owner' || role === 'owner_user' || role === 'owneruser' || user?.role === 0
  const isStaff = isGodmode || role === 'staff' || user?.role === 1
  const isInstructor = isGodmode || role === 'instructor'

  const canView = isOwner || isStaff || isInstructor

  const { data, loading, error, refetch } = useQuery(CLIENT_PROFILE, {
    skip: !user || !canView,
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })

  const [updateClient] = useMutation(UPDATE_CLIENT)
  const [createClientNote] = useMutation(CREATE_CLIENT_NOTE)

  const client = data?.client
  const bookings = useMemo(() => (client?.bookings || []), [client?.bookings])
  const notes = client?.clientNotes || []

  const [newNoteBody, setNewNoteBody] = useState('')
  const [scoresDraft, setScoresDraft] = useState([])
  const [savingScores, setSavingScores] = useState(false)
  const [addingNote, setAddingNote] = useState(false)

  useEffect(() => {
    const next = safeArray(client?.characteristicScores)
      .map((row) => ({
        label: (row?.label || '').toString(),
        score: typeof row?.score === 'number' ? row.score : (row?.score ? Number(row.score) : 0),
        note: (row?.note || '').toString(),
      }))
      .filter((r) => r.label || r.score || r.note)
    setScoresDraft(next)
  }, [client?.id, client?.characteristicScores])

  const classesSummary = useMemo(() => {
    const byTitle = new Map()
    for (const b of bookings) {
      if (!b || b.status === 'cancelled' || b.archived) continue
      const title = b?.classSession?.classTemplate?.title || 'Class'
      const when = b?.classSession?.startTime
      const prev = byTitle.get(title) || { title, count: 0, lastAt: null }
      const nextLast = when ? new Date(when) : null
      const prevLast = prev.lastAt ? new Date(prev.lastAt) : null
      byTitle.set(title, {
        title,
        count: prev.count + 1,
        lastAt: (!prevLast || (nextLast && nextLast > prevLast)) ? when : prev.lastAt,
      })
    }
    return Array.from(byTitle.values())
      .sort((a, b) => (b.count - a.count) || (a.title || '').localeCompare(b.title || ''))
  }, [bookings])

  if (!user) {
    return <p className="text-sm text-slate-400">Sign in to view client profiles.</p>
  }

  if (!canView) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-200">
        <h1 className="mb-2 text-lg font-semibold text-slate-50">Restricted</h1>
        <p className="text-sm text-slate-400">Only owners, staff, and instructors can view client profiles.</p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              {client?.name || 'Client profile'}
            </h1>
            <p className="text-sm text-slate-400">A quick view of history, notes, and instructor-facing characteristics.</p>
          </div>
          <Link
            to="/clients"
            className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-800"
          >
            Back to clients
          </Link>
        </div>
        {client && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Email</div>
              <div className="mt-1 text-sm text-slate-200">{client.email || '—'}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Phone</div>
              <div className="mt-1 text-sm text-slate-200">{client.phone || '—'}</div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Bookings</div>
              <div className="mt-1 text-sm text-slate-200">{bookings.length}</div>
            </div>
          </div>
        )}
      </header>

      {loading && (
        <p className="text-sm text-slate-400">Loading client…</p>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-700/40 bg-rose-950/30 p-4 text-sm text-rose-200">
          {error.message || 'Could not load client.'}
        </div>
      )}

      {!loading && !error && !client && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
          Client not found.
        </div>
      )}

      {!loading && client && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Characteristics</h2>
                <button
                  type="button"
                  onClick={() => setScoresDraft((rows) => ([...rows, { label: '', score: 3, note: '' }]))}
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Add
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {scoresDraft.length === 0 && (
                  <p className="text-sm text-slate-400">No characteristics yet. Add a few scoring rows to help instructors quickly understand this client.</p>
                )}

                {scoresDraft.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3 md:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)_auto]">
                    <input
                      value={row.label}
                      onChange={(e) => setScoresDraft((rows) => rows.map((r, i) => i === idx ? { ...r, label: e.target.value } : r))}
                      placeholder="Characteristic (e.g. mobility, strength, experience)"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                    <select
                      value={row.score || 0}
                      onChange={(e) => setScoresDraft((rows) => rows.map((r, i) => i === idx ? { ...r, score: Number(e.target.value) } : r))}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value={0}>—</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>
                    <input
                      value={row.note}
                      onChange={(e) => setScoresDraft((rows) => rows.map((r, i) => i === idx ? { ...r, note: e.target.value } : r))}
                      placeholder="Optional note"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setScoresDraft((rows) => rows.filter((_, i) => i !== idx))}
                      className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
                      aria-label="Remove characteristic"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={savingScores}
                  onClick={async () => {
                    try {
                      if (savingScores) return
                      setSavingScores(true)
                      const cleaned = scoresDraft
                        .map((r) => ({
                          label: (r.label || '').toString().trim(),
                          score: Number(r.score) || 0,
                          note: (r.note || '').toString().trim(),
                        }))
                        .filter((r) => r.label || r.score || r.note)

                      const res = await updateClient({
                        variables: {
                          id: client.id,
                          characteristicScores: cleaned,
                        },
                      })

                      const payload = res.data?.updateClient
                      const errors = payload?.errors || []
                      if (errors.length || !payload?.client) throw new Error(errors.join(', ') || 'Could not save scores')
                      addToast({ message: 'Characteristics saved', type: 'success' })
                      await refetch()
                    } catch (e) {
                      addToast({ message: e.message || 'Could not save characteristics', type: 'error' })
                    } finally {
                      setSavingScores(false)
                    }
                  }}
                  className="rounded-full bg-sky-500 px-4 py-1.5 text-sm font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Notes</h2>
                <span className="text-[11px] text-slate-500">Visible to your team</span>
              </div>

              <div className="mt-3 space-y-2">
                <textarea
                  value={newNoteBody}
                  onChange={(e) => setNewNoteBody(e.target.value)}
                  rows={3}
                  placeholder="Add a note for instructors (goals, injuries, preferences, cues that work, etc.)"
                  className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={addingNote || !newNoteBody.trim()}
                    onClick={async () => {
                      try {
                        if (!newNoteBody.trim()) return
                        setAddingNote(true)
                        const res = await createClientNote({ variables: { clientId: client.id, body: newNoteBody.trim() } })
                        const payload = res.data?.createClientNote
                        const errors = payload?.errors || []
                        if (errors.length || !payload?.note) throw new Error(errors.join(', ') || 'Could not add note')
                        setNewNoteBody('')
                        addToast({ message: 'Note added', type: 'success' })
                        await refetch()
                      } catch (e) {
                        addToast({ message: e.message || 'Could not add note', type: 'error' })
                      } finally {
                        setAddingNote(false)
                      }
                    }}
                    className="rounded-full bg-sky-500 px-4 py-1.5 text-sm font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Add note
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {notes.length === 0 && (
                  <p className="text-sm text-slate-400">No notes yet.</p>
                )}
                {notes.map((n) => (
                  <div key={n.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-300">{n.author?.name || n.author?.email || 'User'}</span>
                        <span className="mx-2 text-slate-600">•</span>
                        <span>{formatDateTime(n.createdAt)}</span>
                      </div>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{n.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Classes</h2>
              <div className="mt-3">
                {classesSummary.length === 0 ? (
                  <p className="text-sm text-slate-400">No booking history yet.</p>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-800">
                    <table className="min-w-full text-left text-sm text-slate-200">
                      <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Class</th>
                          <th className="px-3 py-2">Count</th>
                          <th className="px-3 py-2">Last</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classesSummary.map((c) => (
                          <tr key={c.title} className="border-t border-slate-800">
                            <td className="px-3 py-2">{c.title}</td>
                            <td className="px-3 py-2 text-slate-300">{c.count}</td>
                            <td className="px-3 py-2 text-slate-400">{c.lastAt ? formatDateTime(c.lastAt) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">History</h2>
                <span className="text-[11px] text-slate-500">Most recent first</span>
              </div>
              <div className="mt-3">
                {bookings.length === 0 ? (
                  <p className="text-sm text-slate-400">No bookings found.</p>
                ) : (
                  <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-800">
                    <table className="min-w-full text-left text-sm text-slate-200">
                      <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                        <tr>
                          <th className="px-3 py-2">When</th>
                          <th className="px-3 py-2">Class</th>
                          <th className="px-3 py-2">Instructor</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((b) => (
                          <tr key={b.id} className="border-t border-slate-800">
                            <td className="px-3 py-2 text-slate-300">{formatDateTime(b?.classSession?.startTime || b.createdAt)}</td>
                            <td className="px-3 py-2">{b?.classSession?.classTemplate?.title || 'Session'}</td>
                            <td className="px-3 py-2 text-slate-300">{b?.classSession?.instructor?.name || '—'}</td>
                            <td className="px-3 py-2 text-slate-400">{b.status}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${b.paid ? 'bg-emerald-500/10 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}>
                                {b.paid ? 'Paid' : 'Unpaid'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
