import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { useAuth } from '../auth/AuthProvider'
import { MODERATORS, CREATE_MODERATOR } from '../apollo/queries'

function CredentialCard({ email, password, onDismiss }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(null)

  const copy = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-5 shadow-sm shadow-black/30">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Moderator Created
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Dismiss
        </button>
      </div>
      <p className="mb-4 text-xs text-slate-400">
        Save these credentials now — the password will not be shown again after you dismiss this card.
      </p>

      <div className="flex flex-col gap-3">
        {/* Email */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Email</div>
            <div className="mt-0.5 font-mono text-sm text-slate-100">{email}</div>
          </div>
          <button
            type="button"
            onClick={() => copy(email, 'email')}
            className="shrink-0 rounded-md border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800"
          >
            {copied === 'email' ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Password */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Password</div>
            <div className="mt-0.5 font-mono text-sm text-slate-100 tracking-widest">
              {revealed ? password : '•'.repeat(password.length)}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="rounded-md border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800"
            >
              {revealed ? 'Hide' : 'Reveal'}
            </button>
            <button
              type="button"
              onClick={() => copy(password, 'password')}
              className="rounded-md border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-800"
            >
              {copied === 'password' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GodmodeModerators() {
  const { user, isImpersonating } = useAuth()

  const roleName = (user?.roleName || '').toString().toLowerCase()
  const isGodmode = user?.godmode === true || roleName === 'godmode'

  const [form, setForm] = useState({ email: '', name: '' })
  const [formErrors, setFormErrors] = useState([])
  const [newCred, setNewCred] = useState(null)

  const { data, loading, refetch } = useQuery(MODERATORS, {
    fetchPolicy: 'cache-and-network',
    skip: !isGodmode,
  })

  const [createModerator, { loading: creating }] = useMutation(CREATE_MODERATOR)

  const moderators = data?.moderators || []

  if (!user) return <Navigate to="/signin" replace />
  if (!isGodmode || isImpersonating) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormErrors([])
    setNewCred(null)

    const email = form.email.trim()
    if (!email) {
      setFormErrors(['Email is required'])
      return
    }

    try {
      const { data: res } = await createModerator({
        variables: { email, name: form.name.trim() || undefined },
      })
      const result = res?.createModerator
      if (result?.errors?.length) {
        setFormErrors(result.errors)
        return
      }
      if (result?.user && result?.plaintextPassword) {
        setNewCred({ email: result.user.email, password: result.plaintextPassword })
        setForm({ email: '', name: '' })
        refetch()
      }
    } catch (err) {
      setFormErrors([err.message || 'An unexpected error occurred'])
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 p-1">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Mission Control</h1>
          <span className="rounded-full border border-violet-700/60 bg-violet-950/40 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-violet-400">
            Godmode
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Manage StudioFlow platform moderators — internal team members with platform-level access.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Create moderator form */}
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm shadow-black/20">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">
            Add Moderator
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400" htmlFor="mod-email">
                Email <span className="text-rose-400">*</span>
              </label>
              <input
                id="mod-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="moderator@studioflow.io"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400" htmlFor="mod-name">
                Display Name <span className="text-slate-600">(optional)</span>
              </label>
              <input
                id="mod-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe"
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              A random strong password will be generated. Copy it from the credential card before dismissing.
            </p>

            {formErrors.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-lg border border-rose-800/60 bg-rose-950/40 px-4 py-3">
                {formErrors.map((err) => (
                  <li key={err} className="text-xs text-rose-300">{err}</li>
                ))}
              </ul>
            )}

            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create Moderator'}
            </button>
          </form>
        </section>

        {/* Credential reveal card */}
        <section className="flex flex-col gap-4">
          {newCred ? (
            <CredentialCard
              email={newCred.email}
              password={newCred.password}
              onDismiss={() => setNewCred(null)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center">
              <p className="text-sm text-slate-600">
                Credentials will appear here after creating a moderator.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Moderator list */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm shadow-black/20">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">
            Active Moderators
          </div>
          <div className="text-xs text-slate-500">
            {loading ? '…' : `${moderators.length} total`}
          </div>
        </div>

        {loading && (
          <div className="py-6 text-center text-sm text-slate-500">Loading…</div>
        )}

        {!loading && moderators.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-600">
            No moderators yet. Create the first one above.
          </div>
        )}

        {!loading && moderators.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Name</th>
                  <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Email</th>
                  <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</th>
                  <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {moderators.map((mod) => (
                  <tr key={mod.id} className="group">
                    <td className="py-3 pr-4 text-slate-200">
                      {mod.name || <span className="text-slate-600 italic">—</span>}
                    </td>
                    <td className="py-3 pr-4 font-mono text-slate-300">{mod.email}</td>
                    <td className="py-3 pr-4">
                      {mod.active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-slate-500">
                      {mod.createdAt
                        ? new Date(mod.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
