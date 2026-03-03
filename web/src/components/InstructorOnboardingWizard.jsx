import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@apollo/client'
import { INVITE_USER } from '../apollo/mutations'
import { UPDATE_USER } from '../apollo/mutations'
import { CREATE_INSTRUCTOR_CONNECT_ONBOARDING } from '../apollo/mutations'

// ─── helpers ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'info',         label: 'Info' },
  { id: 'compensation', label: 'Pay' },
  { id: 'stripe',       label: 'Stripe' },
  { id: 'done',         label: 'Done' },
]

function StepDot({ active, done, label, idx }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold transition-all ${
          done
            ? 'border-sky-500 bg-sky-500 text-white'
            : active
            ? 'border-sky-400 bg-sky-400/10 text-sky-300'
            : 'border-slate-700 bg-slate-900 text-slate-500'
        }`}
      >
        {done ? '✓' : idx + 1}
      </div>
      <span className={`text-[10px] uppercase tracking-[0.18em] ${active ? 'text-sky-400' : done ? 'text-sky-500/70' : 'text-slate-600'}`}>
        {label}
      </span>
    </div>
  )
}

function StepConnector({ done }) {
  return (
    <div className={`mb-4 h-px flex-1 transition-colors ${done ? 'bg-sky-500/50' : 'bg-slate-800'}`} />
  )
}

function FieldLabel({ children, optional }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400/70">{children}</label>
      {optional && <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-500">optional</span>}
    </div>
  )
}

function Field({ label, optional, children }) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      {children}
    </div>
  )
}

const INPUT = 'w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition'

// ─── Main component ──────────────────────────────────────────────────────────

export default function InstructorOnboardingWizard({ open, onClose, onDone }) {
  const overlayRef = useRef(null)

  // step state
  const [step, setStep] = useState(0) // 0=info, 1=comp, 2=stripe, 3=done

  // Step 1 — info
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [infoError, setInfoError] = useState('')

  // Step 2 — compensation
  const [compType, setCompType]         = useState('split') // 'split' | 'flat'
  const [splitPct, setSplitPct]         = useState(50)
  const [flatCents, setFlatCents]       = useState('')      // display in dollars
  const [compSaved, setCompSaved]       = useState(false)

  // Step 3 — stripe
  const [stripeUrl, setStripeUrl]       = useState('')
  const [stripeStatus, setStripeStatus] = useState('idle') // idle | loading | sent | skipped | error
  const [stripeError, setStripeError]   = useState('')

  // created instructor id (set after invite succeeds)
  const [createdUserId, setCreatedUserId] = useState(null)

  // mutations
  const [inviteUser,    { loading: inviting }]    = useMutation(INVITE_USER)
  const [updateUser,    { loading: updatingComp }] = useMutation(UPDATE_USER)
  const [createConnect, { loading: stripeLoading }] = useMutation(CREATE_INSTRUCTOR_CONNECT_ONBOARDING)

  // reset when opened
  const resetState = () => {
    setStep(0)
    setName('')
    setEmail('')
    setInfoError('')
    setCompType('split')
    setSplitPct(50)
    setFlatCents('')
    setCompSaved(false)
    setStripeUrl('')
    setStripeStatus('idle')
    setStripeError('')
    setCreatedUserId(null)
  }

  // close on escape / outside click
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') { resetState(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const stepIdx = step

  // ─── Step handlers ──────────────────────────────────────────────────────

  async function handleInfoNext() {
    setInfoError('')
    const trimmedEmail = email.trim()
    const trimmedName  = name.trim()

    if (!trimmedEmail) {
      setInfoError('Email is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setInfoError('Enter a valid email address.')
      return
    }

    try {
      const res = await inviteUser({
        variables: { email: trimmedEmail, name: trimmedName || null, role: 2 },
      })
      const payload = res.data?.inviteUser
      const errors  = payload?.errors || []
      if (errors.length) {
        setInfoError(errors.join(', '))
        return
      }
      setCreatedUserId(payload.user.id)
      setStep(1)
    } catch (e) {
      setInfoError(e.message || 'Could not send invite.')
    }
  }

  async function handleCompNext() {
    if (!createdUserId) { setStep(2); return }

    const vars = {
      id: createdUserId,
      instructorCompensationType: compType,
      instructorDefaultSplitPercent: compType === 'split' ? Number(splitPct) : null,
      instructorDefaultFlatRateCents: compType === 'flat' ? Math.round(Number(flatCents || 0) * 100) : null,
    }

    try {
      const res = await updateUser({ variables: vars })
      const errors = res.data?.updateUser?.errors || []
      if (errors.length) {
        // non-blocking — show but allow proceeding
        console.warn('Comp update errors:', errors)
      }
      setCompSaved(true)
    } catch {
      // non-fatal
    }
    setStep(2)
  }

  async function handleSendStripe() {
    if (!createdUserId) return
    setStripeStatus('loading')
    setStripeError('')
    try {
      const res = await createConnect({ variables: { instructorId: createdUserId } })
      const payload = res.data?.createInstructorConnectOnboarding
      const errors  = payload?.errors || []
      if (errors.length) {
        setStripeError(errors.join(', '))
        setStripeStatus('error')
        return
      }
      setStripeUrl(payload.onboardingUrl || '')
      setStripeStatus('sent')
    } catch (e) {
      setStripeError(e.message || 'Could not start Stripe onboarding.')
      setStripeStatus('error')
    }
  }

  function handleSkipStripe() {
    setStripeStatus('skipped')
    setStep(3)
  }

  function handleStripeDone() {
    setStep(3)
  }

  // ── render ──────────────────────────────────────────────────────────────

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add instructor"
    >
      {/* backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => { resetState(); onClose() }}
      />

      {/* panel */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">Add Instructor</div>
            <div className="mt-0.5 text-xs text-slate-500">Set up a new instructor account for your studio</div>
          </div>
          <button
            type="button"
            onClick={() => { resetState(); onClose() }}
            className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* stepper */}
        <div className="flex items-center gap-0 px-6 pt-5">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <StepDot
                idx={i}
                label={s.label}
                active={stepIdx === i}
                done={stepIdx > i}
              />
              {i < STEPS.length - 1 && (
                <StepConnector done={stepIdx > i} />
              )}
            </div>
          ))}
        </div>

        {/* body */}
        <div className="px-6 pb-6 pt-4">

          {/* ── Step 0: Info ──────────────────────────────────────────── */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-400">
                Enter the instructor's details. They'll receive an email to set their password and join your studio.
              </p>

              <Field label="Name" optional>
                <input
                  className={INPUT}
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </Field>

              <Field label="Email">
                <input
                  className={INPUT}
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInfoNext() }}
                />
              </Field>

              {infoError && (
                <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
                  {infoError}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleInfoNext}
                  disabled={inviting}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 transition"
                >
                  {inviting ? 'Sending invite…' : 'Send invite & continue'}
                  {!inviting && <span aria-hidden>→</span>}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1: Compensation ──────────────────────────────────── */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3">
                <span className="mt-0.5 text-emerald-400">✓</span>
                <div>
                  <div className="text-sm font-semibold text-slate-100">{name || email} invited</div>
                  <div className="text-xs text-slate-400">A password setup email has been sent to <span className="text-slate-200">{email}</span>.</div>
                </div>
              </div>

              <p className="text-sm text-slate-400">
                Set this instructor's default pay structure. This can be overridden per class template later.
              </p>

              {/* type toggle */}
              <Field label="Compensation type">
                <div className="flex gap-2">
                  {[
                    { value: 'split', label: 'Revenue split', icon: '%' },
                    { value: 'flat',  label: 'Flat rate per class', icon: '$' },
                  ].map(({ value, label, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCompType(value)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        compType === value
                          ? 'border-sky-500/60 bg-sky-500/10 text-sky-300'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        compType === value ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-500'
                      }`}>{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>

              {compType === 'split' && (
                <Field label="Instructor split %">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={splitPct}
                      onChange={(e) => setSplitPct(e.target.value)}
                      className="flex-1 accent-sky-500"
                    />
                    <span className="w-12 text-right text-sm font-semibold text-sky-400">{splitPct}%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Instructor earns <strong className="text-slate-300">{splitPct}%</strong> of each class's gross revenue.
                    Studio keeps <strong className="text-slate-300">{100 - splitPct}%</strong>.
                  </p>
                </Field>
              )}

              {compType === 'flat' && (
                <Field label="Flat rate per class">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">$</span>
                    <input
                      className={INPUT}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={flatCents}
                      onChange={(e) => setFlatCents(e.target.value)}
                    />
                    <span className="text-sm text-slate-400">per class</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Instructor earns a fixed rate for each class they teach, regardless of attendance.
                  </p>
                </Field>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-sm text-slate-500 hover:text-slate-300 transition"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={handleCompNext}
                  disabled={updatingComp}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 transition"
                >
                  {updatingComp ? 'Saving…' : 'Save & continue'}
                  {!updatingComp && <span aria-hidden>→</span>}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Stripe Connect ────────────────────────────────── */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              {compSaved && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  <div className="text-sm text-slate-300">
                    Compensation saved —{' '}
                    {compType === 'split'
                      ? `${splitPct}% revenue split`
                      : `$${Number(flatCents || 0).toFixed(2)} flat rate per class`}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-base">💳</span>
                  <span className="text-sm font-semibold text-slate-100">Stripe Connect</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">Optional</span>
                </div>
                <p className="text-sm text-slate-400">
                  Connect this instructor to Stripe so you can pay them directly from within StudioFlow.
                  They'll complete a short Stripe onboarding flow on their own device.
                </p>
              </div>

              {stripeStatus === 'idle' && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleSendStripe}
                    disabled={stripeLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-300 hover:border-sky-500/60 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-60 transition"
                  >
                    {stripeLoading ? 'Generating link…' : 'Generate Stripe Connect onboarding link'}
                  </button>
                </div>
              )}

              {stripeStatus === 'loading' && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-400 animate-pulse">
                  Connecting to Stripe…
                </div>
              )}

              {stripeStatus === 'error' && (
                <div className="flex flex-col gap-2">
                  <p className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
                    {stripeError}
                  </p>
                  <button
                    type="button"
                    onClick={handleSendStripe}
                    className="text-sm text-sky-400 hover:text-sky-300 transition"
                  >
                    Try again
                  </button>
                </div>
              )}

              {stripeStatus === 'sent' && stripeUrl && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 px-4 py-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400/70">Onboarding link</div>
                    <div className="mb-3 break-all rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-300">
                      {stripeUrl}
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={stripeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 transition"
                      >
                        Open link ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(stripeUrl)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Share this link with <span className="text-slate-300">{name || email}</span>.
                    They'll complete Stripe's form on their own. You can check their status later from Instructor payouts.
                  </p>
                </div>
              )}

              {stripeStatus === 'error' && (
                <p className="text-xs text-slate-500">
                  You can set up Stripe Connect later from the Instructor payouts page.
                </p>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleSkipStripe}
                  className="text-sm text-slate-500 hover:text-slate-300 transition"
                >
                  {stripeStatus === 'sent' ? 'Skip for now' : 'Skip Stripe setup'}
                </button>
                {(stripeStatus === 'sent' || stripeStatus === 'skipped') && (
                  <button
                    type="button"
                    onClick={handleStripeDone}
                    className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition"
                  >
                    Continue <span aria-hidden>→</span>
                  </button>
                )}
                {stripeStatus === 'idle' && (
                  <button
                    type="button"
                    onClick={handleSkipStripe}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
                  >
                    Skip & finish
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Done ─────────────────────────────────────────── */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-2xl">
                  🎉
                </div>
                <div>
                  <div className="text-base font-semibold text-slate-100">
                    {name || email} is all set!
                  </div>
                  <div className="mt-1 text-sm text-slate-400">Here's a summary of what was configured.</div>
                </div>
              </div>

              <ul className="flex flex-col gap-2">
                <SummaryRow
                  icon="✉️"
                  label="Invite sent"
                  value={`Password setup email sent to ${email}`}
                />
                <SummaryRow
                  icon="💰"
                  label="Compensation"
                  value={
                    compSaved
                      ? compType === 'split'
                        ? `${splitPct}% revenue split`
                        : `$${Number(flatCents || 0).toFixed(2)} flat rate per class`
                      : 'Not configured (set later in Owner workspace)'
                  }
                  muted={!compSaved}
                />
                <SummaryRow
                  icon="💳"
                  label="Stripe Connect"
                  value={
                    stripeStatus === 'sent'
                      ? 'Onboarding link generated — share it with the instructor'
                      : 'Not set up (configure from Instructor payouts)'
                  }
                  muted={stripeStatus !== 'sent'}
                />
              </ul>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onDone?.()
                    resetState()
                    onClose()
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-400 transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function SummaryRow({ icon, label, value, muted }) {
  return (
    <li className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${muted ? 'border-slate-800 bg-slate-900/40' : 'border-emerald-500/20 bg-emerald-950/15'}`}>
      <span className="mt-0.5 text-base leading-none">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400/70">{label}</div>
        <div className={`mt-0.5 text-sm ${muted ? 'text-slate-500' : 'text-slate-200'}`}>{value}</div>
      </div>
    </li>
  )
}
