import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export default function SignUp() {
  const { user } = useAuth()
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen md:grid-cols-2">
        <AuthMarketingPanel />

        <div className="flex items-center justify-center px-4 py-10 md:border-l md:border-slate-800">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-black/25">
            <div className="mb-6 text-center">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-400/80">
                StudioFlow
              </div>
              <h2 className="text-xl font-semibold text-slate-50">Choose your portal</h2>
              <p className="mt-1 text-xs text-slate-400">Create an owner account or a client account.</p>
            </div>

            <div className="space-y-3">
              <Link
                to="/signup/owner"
                className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400"
              >
                I’m a studio owner
              </Link>
              <Link
                to="/signup/client"
                className="flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
              >
                I’m a client
              </Link>
              <div className="pt-2 text-center text-xs text-slate-400">
                Already have an account?{' '}
                <Link to="/signin" className="text-slate-200 hover:text-white">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthMarketingPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-slate-950 md:flex md:min-h-screen md:items-stretch">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 opacity-70">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative flex w-full flex-col justify-between p-10">
        <div>
          <div className="text-xs font-semibold tracking-[0.3em] uppercase text-sky-400/80">
            Studio<strong className="text-slate-300">Flow</strong>
          </div>
          <h1 className="mt-6 max-w-md text-3xl font-semibold tracking-tight text-slate-50">
            Start in minutes.
          </h1>
          <p className="mt-3 max-w-md text-sm text-slate-300">
            Owners manage schedules and payments. Clients book sessions and stay organized.
          </p>
        </div>

        <div className="pointer-events-none relative mt-10 flex flex-1 items-center justify-center">
          <svg
            viewBox="0 0 900 700"
            className="h-full w-full max-w-2xl"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="sf" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <g className="text-sky-400">
              <path
                d="M140 540c110-120 230-180 360-190 160-12 270 70 360 210"
                fill="none"
                stroke="url(#sf)"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M190 220c90 10 160-6 220-46 80-55 150-110 270-96 90 10 160 70 200 150"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.16"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <circle cx="280" cy="260" r="80" fill="currentColor" opacity="0.06" />
              <circle cx="620" cy="380" r="120" fill="currentColor" opacity="0.05" />
              <circle cx="740" cy="180" r="64" fill="currentColor" opacity="0.06" />
              <path
                d="M260 470h380"
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M320 530h260"
                stroke="currentColor"
                strokeOpacity="0.10"
                strokeWidth="10"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        <div className="text-xs text-slate-500">
          Owner portal • Client portal • One unified dashboard
        </div>
      </div>
    </div>
  )
}
