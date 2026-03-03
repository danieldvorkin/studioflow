import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useStudio } from '../studio/StudioProvider'

export default function StudiosPage() {
  const { user } = useAuth()
  const { studios, selectedStudioId, loading } = useStudio()

  if (!user) return <Navigate to="/signin" replace />

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Studios</h1>
        <p className="text-sm text-slate-400">
          Browse available studios, meet the instructors, and explore class schedules.
        </p>
      </header>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-900" />
          ))}
        </div>
      )}

      {!loading && studios.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">
          No studios available yet.
        </div>
      )}

      {!loading && studios.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {studios.map((studio) => {
            const isSelected = selectedStudioId === studio.id
            return (
              <Link
                key={studio.id}
                to={`/studios/${studio.id}`}
                className={`group flex flex-col gap-3 rounded-2xl border p-6 transition hover:border-sky-500/60 hover:bg-slate-900/80 ${
                  isSelected
                    ? 'border-sky-500/50 bg-sky-900/10'
                    : 'border-slate-700 bg-slate-900/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-fuchsia-500 text-lg font-bold text-white">
                    {studio.name.charAt(0).toUpperCase()}
                  </div>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-900/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <span className="h-1 w-1 rounded-full bg-emerald-400" />
                      Current
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-slate-100 group-hover:text-white">
                    {studio.name}
                  </div>
                  {studio.studioLocations?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {studio.studioLocations.map((loc) => (
                        <span
                          key={loc.id}
                          className="text-[11px] text-slate-500"
                        >
                          {loc.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-auto text-xs font-semibold text-sky-400 group-hover:text-sky-300">
                  View studio →
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
