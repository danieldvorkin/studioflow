import { useMutation, gql } from '@apollo/client'
import client from '../apollo/client'
import { useForm } from 'react-hook-form'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { SIGN_IN_WITH_GOOGLE } from '../apollo/mutations'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import DevSeedLoginButtons from '../auth/DevSeedLoginButtons'

const SIGN_IN = gql`
  mutation SignIn($email: String!, $password: String!) {
    signIn(input: { email: $email, password: $password }) {
      token
      user { id email name role roleName active availableForSessions }
      errors
    }
  }
`

export default function SignIn() {
  const [signInWithGoogle] = useMutation(SIGN_IN_WITH_GOOGLE)
  const [error, setError] = useState(null)
  const [googleStarting, setGoogleStarting] = useState(false)
  const [signIn, { loading }] = useMutation(SIGN_IN)
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const didConsumeDevSeed = useRef(false)

  const devSeedAccount = (import.meta.env.DEV && location?.state?.devSeed?.email && location?.state?.devSeed?.password)
    ? location.state.devSeed
    : null

  const { register, handleSubmit, setValue } = useForm({
    defaultValues: devSeedAccount
      ? { email: devSeedAccount.email, password: devSeedAccount.password }
      : undefined,
  })

  const onSubmit = useCallback(async (data) => {
    setError(null)
    try {
      const res = await signIn({ variables: data })
      const payload = res?.data?.signIn
      if (payload?.token) {
        try {
          if (payload.user) {
            try { localStorage.setItem('pilates_user', JSON.stringify(payload.user)) } catch (e) { void e }
          }
          await auth.signInWithToken(payload.token, payload.user || null)
          try { await client.resetStore() } catch (e) { void e }
          navigate('/dashboard')
        } catch (e) {
          void e
          setError('Sign-in succeeded but fetching user failed')
        }
      } else {
        setError((payload && payload.errors && payload.errors.join(', ')) || 'Sign in failed')
      }
    } catch (e) {
      setError(e.message)
    }
  }, [auth, navigate, signIn])

  const onPickDevSeed = useCallback((account) => {
    if (!account) return
    setError(null)
    setValue('email', account.email, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    setValue('password', account.password, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    queueMicrotask(() => handleSubmit(onSubmit)())
  }, [handleSubmit, onSubmit, setValue])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    if (didConsumeDevSeed.current) return
    if (!devSeedAccount?.email || !devSeedAccount?.password) return

    didConsumeDevSeed.current = true
    setTimeout(() => {
      handleSubmit(onSubmit)()
    }, 0)
    // Clear state so we don't re-trigger on refresh/back
    navigate(location.pathname, { replace: true, state: null })
  }, [devSeedAccount?.email, devSeedAccount?.password, handleSubmit, location.pathname, navigate, onSubmit])

  const handleGoogleAccessToken = async (accessToken) => {
    setError(null)
    if (!accessToken) {
      setError('No Google access token received')
      return
    }
    try {
      const res = await signInWithGoogle({ variables: { accessToken } })
      const payload = res?.data?.signInWithGoogle
      if (payload?.token) {
        try {
          if (payload.user) {
            try { localStorage.setItem('pilates_user', JSON.stringify(payload.user)) } catch (e) { void e }
          }
          await auth.signInWithToken(payload.token, payload.user || null)
          try { await client.resetStore() } catch (e) { void e }
          navigate('/dashboard')
        } catch (e) {
          void e
          setError('Google sign-in succeeded but fetching user failed')
        }
      } else {
        setError((payload && payload.errors && payload.errors.join(', ')) || 'Google sign-in failed')
      }
    } catch (e) {
      console.error('Google sign-in error', e)
      setError(e.message || 'Google sign-in error')
    }
  }

  const startGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    scope: 'openid email profile',
    ux_mode: 'popup',
    onSuccess: async (codeResponse) => {
      setGoogleStarting(false)
      await handleGoogleAccessToken(codeResponse?.access_token)
    },
    onError: () => {
      setGoogleStarting(false)
      setError('Google sign-in failed')
    },
  })

  const onGoogleClick = () => {
    setError(null)
    setGoogleStarting(true)
    try {
      startGoogleLogin()
    } catch (e) {
      setGoogleStarting(false)
      setError(e?.message || 'Google sign-in failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen md:grid-cols-2">
        <AuthMarketingPanel>
          {import.meta.env.DEV && (
            <DevSeedLoginButtons
              variant="bare"
              density="compact"
              layout="row"
              busy={loading || googleStarting}
              onPick={onPickDevSeed}
            />
          )}
        </AuthMarketingPanel>

        <div className="flex items-center justify-center px-4 py-10 md:border-l md:border-slate-800">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-black/25">
            <div className="mb-6 text-center">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-400/80">
                StudioFlow
              </div>
              <h2 className="text-xl font-semibold text-slate-50">Sign in</h2>
              <p className="mt-1 text-xs text-slate-400">Access your classes, clients, and schedule.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                <input
                  {...register('password')}
                  type="password"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-0 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
              {error && (
                <p className="text-xs text-rose-400">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {import.meta.env.DEV && (
              <div className="mt-4 md:hidden">
                <DevSeedLoginButtons busy={loading || googleStarting} onPick={onPickDevSeed} />
              </div>
            )}

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">or</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={onGoogleClick}
                disabled={googleStarting}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900/60 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-emerald-400 to-amber-300 text-[11px] font-black text-slate-950"
                >
                  G
                </span>
                {googleStarting ? 'Opening Google…' : 'Continue with Google'}
              </button>
            </div>

            <div className="mt-4 text-center text-xs text-slate-400">
              Don’t have an account?{' '}
              <Link to="/signup" className="text-slate-200 hover:text-white">Sign up</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthMarketingPanel({ children }) {
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
            Run your studio with confidence.
          </h1>
          <p className="mt-3 max-w-md text-sm text-slate-300">
            Schedules, bookings, clients, and payments — in one place.
          </p>
        </div>

        <div className="relative mt-8 flex flex-1 items-center justify-center">
          <svg
            viewBox="0 0 900 700"
            className="h-full w-full max-w-2xl"
            aria-hidden="true"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <linearGradient id="sf" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <g className="text-sky-400">
              <path
                d="M110 520C210 420 300 350 420 330c120-20 210 10 300 80 60 50 90 90 130 170"
                fill="none"
                stroke="url(#sf)"
                strokeWidth="18"
                strokeLinecap="round"
              />
              <path
                d="M160 200c110 30 200 40 280 10 90-35 150-95 240-110 80-14 150 10 210 80"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.16"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <circle cx="260" cy="250" r="70" fill="currentColor" opacity="0.06" />
              <circle cx="610" cy="390" r="110" fill="currentColor" opacity="0.05" />
              <circle cx="720" cy="190" r="60" fill="currentColor" opacity="0.06" />
              <path
                d="M280 460h340"
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M320 520h260"
                stroke="currentColor"
                strokeOpacity="0.10"
                strokeWidth="10"
                strokeLinecap="round"
              />
            </g>

          </svg>
        </div>

        {children && (
          <div className="-mx-10 mt-4 border-t border-slate-800 px-10 pt-3">
            {children}
          </div>
        )}

        <div className="text-xs text-slate-500">
          Secure sign-in • Google OAuth supported • Encrypted tokens
        </div>
      </div>
    </div>
  )
}
