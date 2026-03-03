import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { INVITE_CLIENT } from '../apollo/mutations'
import { CLIENT_INVITATIONS } from '../apollo/queries'
import { useToast } from './ToastProvider'

function StatusBadge({ status }) {
  const map = {
    pending:  'bg-sky-900/50 text-sky-300 border-sky-700',
    accepted: 'bg-green-900/50 text-green-300 border-green-700',
    expired:  'bg-slate-800 text-slate-500 border-slate-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${map[status] ?? map.expired}`}>
      {status}
    </span>
  )
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:border-slate-500 transition"
    >
      {copied ? '✓ Copied' : 'Copy link'}
    </button>
  )
}

export default function InviteClientModal({ onClose }) {
  const { addToast } = useToast()
  const [email, setEmail]   = useState('')
  const [name,  setName]    = useState('')
  const [result, setResult] = useState(null) // { signupUrl, invitation }
  const [errors, setErrors] = useState([])

  const [inviteClient, { loading }] = useMutation(INVITE_CLIENT, {
    refetchQueries: [CLIENT_INVITATIONS],
  })

  const { data: invitationsData } = useQuery(CLIENT_INVITATIONS, {
    fetchPolicy: 'cache-and-network',
  })
  const invitations = invitationsData?.clientInvitations || []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors([])
    if (!email.trim()) { setErrors(['Email is required']); return }

    try {
      const res = await inviteClient({ variables: { email: email.trim().toLowerCase(), name: name.trim() || null } })
      const payload = res.data?.inviteClient
      if (payload?.errors?.length) {
        setErrors(payload.errors)
        return
      }
      setResult({ signupUrl: payload.signupUrl, invitation: payload.invitation })
      setEmail('')
      setName('')
      addToast('Invitation created', 'success')
    } catch (e) {
      setErrors([e.message])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-50">Invite a client</h2>
            <p className="text-xs text-slate-400 mt-0.5">Send a personalised signup link to a new client.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Invite form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Name <span className="text-slate-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                />
              </div>
            </div>

            {errors.length > 0 && (
              <div className="rounded-lg border border-rose-700 bg-rose-900/30 px-4 py-2 text-sm text-rose-200">
                {errors.join(', ')}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60 transition"
            >
              {loading ? (
                <><span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Sending…</>
              ) : 'Send invitation'}
            </button>
          </form>

          {/* Success: show signup URL */}
          {result && (
            <div className="rounded-xl border border-green-700/50 bg-green-900/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-300">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Invitation created for {result.invitation.email}
              </div>
              <p className="text-xs text-slate-400">
                {import.meta.env.PROD
                  ? 'An invitation email has been sent.'
                  : 'Email delivery is disabled in development. Share this link directly:'}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-sky-300 font-mono">
                  {result.signupUrl}
                </code>
                <CopyButton value={result.signupUrl} />
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs text-slate-500 hover:text-slate-300 transition"
              >
                Invite another client
              </button>
            </div>
          )}

          {/* Invitations history */}
          {invitations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Sent invitations</h3>
              <ul className="space-y-1.5">
                {invitations.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-200 truncate">{inv.name || inv.email}</div>
                      {inv.name && <div className="text-xs text-slate-500 truncate">{inv.email}</div>}
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <StatusBadge status={inv.status} />
                      {inv.status === 'pending' && (
                        <CopyButton value={`${window.location.origin}/signup/client?token=${inv.token}`} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
