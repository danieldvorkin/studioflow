import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { MY_STUDIO } from '../apollo/queries'
import { UPDATE_STUDIO, COMPLETE_ONBOARDING, CREATE_STUDIO_LOCATION, CREATE_PLATFORM_SUBSCRIPTION_CHECKOUT } from '../apollo/mutations'
import { useAuth } from '../auth/AuthProvider'

const STEPS = [
  { id: 'profile',      label: 'Studio profile' },
  { id: 'location',     label: 'First location' },
  { id: 'subscription', label: 'Choose plan' },
]

function StepDots({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i < current
                ? 'bg-sky-600 text-white'
                : i === current
                  ? 'bg-sky-500 text-white ring-2 ring-sky-400/40'
                  : 'bg-slate-800 text-slate-500'
            }`}
          >
            {i < current ? (
              <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-8 transition-colors ${i < current ? 'bg-sky-600' : 'bg-slate-700'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function FieldGroup({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
        {label}{required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ ...props }) {
  return (
    <input
      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
      {...props}
    />
  )
}

// ─── Step 1: Studio Profile ───────────────────────────────────────────────────

function ProfileStep({ studio, onNext, onSkip }) {
  const [name, setName] = useState(studio?.name || '')
  const [slug, setSlug] = useState(studio?.slug || '')
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [updateStudio] = useMutation(UPDATE_STUDIO)

  const handleNameChange = (e) => {
    const val = e.target.value
    setName(val)
    if (!slug || slug === studio?.name?.toLowerCase().replace(/\s+/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors([])
    if (!name.trim()) { setErrors(['Studio name is required']); return }

    setSaving(true)
    try {
      const res = await updateStudio({ variables: { name: name.trim(), slug: slug.trim() || null } })
      const errs = res.data?.updateStudio?.errors || []
      if (errs.length > 0) { setErrors(errs); return }
      onNext()
    } catch (e) {
      setErrors([e.message])
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Name your studio</h2>
        <p className="mt-1 text-sm text-slate-400">This is what clients and staff will see everywhere in the app.</p>
      </div>

      <FieldGroup label="Studio name" required>
        <Input
          value={name}
          onChange={handleNameChange}
          placeholder="e.g. Sunrise Pilates Studio"
          autoFocus
        />
      </FieldGroup>

      <FieldGroup label="Subdomain (optional)">
        <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 pr-3 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
          <input
            className="min-w-0 flex-1 rounded-l-lg bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="sunrise-pilates"
          />
          <span className="shrink-0 text-xs text-slate-500">.studioflow.app</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Lowercase letters, numbers, and hyphens only. You can change this later.</p>
      </FieldGroup>

      {errors.length > 0 && (
        <div className="rounded-lg border border-rose-700 bg-rose-900/30 px-4 py-2 text-sm text-rose-200">
          {errors.join(', ')}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onSkip} className="text-xs text-slate-500 hover:text-slate-300 transition">
          Skip for now
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60 transition"
        >
          {saving ? 'Saving…' : 'Continue'}
          {!saving && (
            <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </form>
  )
}

// ─── Step 2: First Location ───────────────────────────────────────────────────

function LocationStep({ onNext, onSkip }) {
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', zip: '' })
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [createLocation] = useMutation(CREATE_STUDIO_LOCATION)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors([])
    if (!form.name.trim()) { setErrors(['Location name is required']); return }

    setSaving(true)
    try {
      const res = await createLocation({
        variables: {
          name: form.name.trim(),
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          zip: form.zip.trim() || null,
        },
      })
      const errs = res.data?.createStudioLocation?.errors || []
      if (errs.length > 0) { setErrors(errs); return }
      onNext()
    } catch (e) {
      setErrors([e.message])
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Add your first location</h2>
        <p className="mt-1 text-sm text-slate-400">Locations help organise your schedule and classes. You can add more later.</p>
      </div>

      <FieldGroup label="Location name" required>
        <Input value={form.name} onChange={set('name')} placeholder="e.g. Downtown Studio" autoFocus />
      </FieldGroup>

      <FieldGroup label="Street address">
        <Input value={form.address} onChange={set('address')} placeholder="123 Main St" />
      </FieldGroup>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">City</label>
          <Input value={form.city} onChange={set('city')} placeholder="Toronto" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">Province</label>
          <Input value={form.state} onChange={set('state')} placeholder="ON" />
        </div>
      </div>

      <FieldGroup label="Postal code">
        <Input value={form.zip} onChange={set('zip')} placeholder="M5V 2T6" className="max-w-[180px] w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition" />
      </FieldGroup>

      {errors.length > 0 && (
        <div className="rounded-lg border border-rose-700 bg-rose-900/30 px-4 py-2 text-sm text-rose-200">
          {errors.join(', ')}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onSkip} className="text-xs text-slate-500 hover:text-slate-300 transition">
          Skip for now
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60 transition"
        >
          {saving ? 'Saving…' : 'Continue'}
          {!saving && (
            <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </form>
  )
}

// ─── Step 3: Subscription ─────────────────────────────────────────────────────

const PLAN_TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 150,
    highlight: 'bg-sky-600 hover:bg-sky-500',
    badge: null,
    features: ['Unlimited bookings & sessions', 'Client management', 'Bundle products', 'Email reminders', 'Custom subdomain'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 300,
    highlight: 'bg-purple-600 hover:bg-purple-500',
    badge: 'Best value',
    features: ['Everything in Basic', 'Full analytics & trends', 'Instructor payout management', 'Stripe Connect', 'Priority support'],
  },
]

function SubscriptionStep({ onFinish }) {
  const [loadingTier, setLoadingTier] = useState(null)
  const [error, setError] = useState(null)
  const [createCheckout] = useMutation(CREATE_PLATFORM_SUBSCRIPTION_CHECKOUT)
  const [completeOnboarding] = useMutation(COMPLETE_ONBOARDING)

  const handleSubscribe = async (tier) => {
    setError(null)
    setLoadingTier(tier)
    try {
      // Mark onboarding complete before redirecting to Stripe
      await completeOnboarding()
      const res = await createCheckout({ variables: { tier } })
      const errs = res.data?.createPlatformSubscriptionCheckout?.errors || []
      const url = res.data?.createPlatformSubscriptionCheckout?.checkoutUrl
      if (errs.length > 0) { setError(errs.join(', ')); setLoadingTier(null); return }
      if (url) { window.location.assign(url) }
    } catch (e) {
      setError(e.message)
      setLoadingTier(null)
    }
  }

  const handleSkip = async () => {
    await completeOnboarding().catch(() => {})
    onFinish()
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Choose your plan</h2>
        <p className="mt-1 text-sm text-slate-400">Start with a 7-day free trial. No charge until the trial ends.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLAN_TIERS.map((tier) => (
          <div
            key={tier.id}
            className="relative flex flex-col rounded-xl border border-slate-700 bg-slate-800/60 p-4 gap-3"
          >
            {tier.badge && (
              <span className="absolute right-3 top-3 rounded-full bg-purple-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
                {tier.badge}
              </span>
            )}
            <div>
              <h3 className="font-semibold text-white">{tier.name}</h3>
              <div className="mt-1">
                <span className="text-2xl font-bold text-white">${tier.price}</span>
                <span className="text-xs text-slate-400"> CAD/mo</span>
              </div>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5">
                  <span className="mt-px text-green-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handleSubscribe(tier.id)}
              disabled={!!loadingTier}
              className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition ${tier.highlight}`}
            >
              {loadingTier === tier.id ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Redirecting…
                </>
              ) : (
                `Start ${tier.name} trial`
              )}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-700 bg-rose-900/30 px-4 py-2 text-sm text-rose-200">{error}</div>
      )}

      <div className="text-center pt-1">
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs text-slate-500 hover:text-slate-300 transition"
        >
          Skip for now — I&apos;ll choose a plan later
        </button>
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function OnboardingModal({ onComplete }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const roleRaw = (user?.roleName || '').toString().toLowerCase()
  const isOwner = roleRaw === 'owner' || user?.role === 0
  const isGodmode = user?.godmode === true || roleRaw === 'godmode'

  const { data, loading } = useQuery(MY_STUDIO, {
    skip: !user || !isOwner || isGodmode,
    fetchPolicy: 'network-only',
  })

  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  const studio = data?.myStudio

  const visible = !dismissed && !loading && studio?.onboardingCompleted === false

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const skip = () => next()

  const finish = () => {
    setDismissed(true)
    onComplete?.()
    navigate('/dashboard')
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-7 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400/80">
              Studio<strong className="text-slate-300">Flow</strong>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Let&apos;s get your studio set up — takes about 2 minutes.</p>
          </div>
          <div className="text-[11px] text-slate-500">
            Step {step + 1} of {STEPS.length}
          </div>
        </div>

        <StepDots current={step} />

        {step === 0 && <ProfileStep studio={studio} onNext={next} onSkip={skip} />}
        {step === 1 && <LocationStep onNext={next} onSkip={skip} />}
        {step === 2 && <SubscriptionStep onFinish={finish} />}
      </div>
    </div>
  )
}
