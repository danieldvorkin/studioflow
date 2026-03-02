import { getDevSeedAccounts, getDevSeedPassword } from './devSeedAccounts'

export default function DevSeedLoginButtons({ busy = false, onPick, variant = 'card', density = 'normal', layout = 'grid' }) {
  if (!import.meta.env.DEV) return null
  if (typeof onPick !== 'function') return null

  const accounts = getDevSeedAccounts()
  const password = getDevSeedPassword()

  const compact = density === 'compact'
  const rowMode = compact && layout === 'row'

  if (rowMode) {
    const row = (
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {accounts.map((a) => (
          <button
            key={a.key}
            type="button"
            disabled={busy}
            onClick={() => onPick(a)}
            className="shrink-0 rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-900/60 disabled:cursor-not-allowed disabled:opacity-60"
            title={`${a.label} — ${a.email} (${password})`}
          >
            {a.label}
          </button>
        ))}
      </div>
    )

    if (variant === 'bare') return row
    return (
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
        {row}
      </div>
    )
  }

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Dev</div>
          <div className={compact ? 'text-xs font-medium text-slate-200' : 'text-xs font-medium text-slate-200'}>Easy login</div>
        </div>
        <div className={compact ? 'text-[10px] text-slate-500' : 'text-[11px] text-slate-500'}>
          Password: <span className="font-mono">{password}</span>
        </div>
      </div>

      <div className={compact ? 'mt-2 grid grid-cols-3 gap-1 md:grid-cols-6' : 'mt-3 grid grid-cols-2 gap-2'}>
        {accounts.map((a) => (
          <button
            key={a.key}
            type="button"
            disabled={busy}
            onClick={() => onPick(a)}
            className={compact
              ? 'flex items-center justify-center rounded-md border border-slate-700 bg-slate-950/40 px-2 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-900/60 disabled:cursor-not-allowed disabled:opacity-60'
              : 'flex items-center justify-center rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900/60 disabled:cursor-not-allowed disabled:opacity-60'}
            title={a.email}
          >
            {a.label}
          </button>
        ))}
      </div>

      {!compact && (
        <div className="mt-2 text-[11px] text-slate-500">
          Override via <span className="font-mono">VITE_SEED_PASSWORD</span>, <span className="font-mono">VITE_SEED_OWNER_EMAIL</span>, <span className="font-mono">VITE_SEED_STAFF_EMAIL</span>, <span className="font-mono">VITE_SEED_SECONDARY_OWNER_EMAIL</span>, <span className="font-mono">VITE_SEED_OWNER_EMAIL_2</span>, <span className="font-mono">VITE_SEED_STAFF_EMAIL_2</span>.
        </div>
      )}
    </>
  )

  if (variant === 'bare') return content

  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
      {content}
    </div>
  )
}
