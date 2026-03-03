import { useMemo, useState, useEffect } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Navigate } from 'react-router-dom'
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useAuth } from '../auth/AuthProvider'
import { useStudio } from '../studio/StudioProvider'
import { MEMBERSHIP_PLANS, CLIENT_MEMBERSHIPS, MY_CLIENT, PAYMENT_PUBLIC_SETTINGS } from '../apollo/queries'
import { PURCHASE_CLIENT_MEMBERSHIP } from '../apollo/mutations'
import { useToast } from '../components/ToastProvider'
import { useTheme } from '../theme/ThemeProvider'
import { getStripeCardElementOptions } from '../theme/stripeElements'
import { normalizeStripeEmail } from '../payments/stripeEmail'

function dollarsFromCents(cents) {
  if (typeof cents !== 'number') return '0.00'
  return (cents / 100).toFixed(2)
}

const STATUS_COLORS = {
  active:    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  paused:    'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/30',
  expired:   'bg-slate-500/10 text-slate-400 border border-slate-500/30',
}

function PerkList({ plan }) {
  const perks = []

  if (plan.reformerClassesPerMonth == null) {
    perks.push('Unlimited Reformer classes / month')
  } else {
    perks.push(`${plan.reformerClassesPerMonth} Reformer class${plan.reformerClassesPerMonth !== 1 ? 'es' : ''} / month`)
  }

  if (plan.matClassesPerMonth != null) {
    perks.push(`${plan.matClassesPerMonth} Mat / Barre / Yoga class${plan.matClassesPerMonth !== 1 ? 'es' : ''} / month`)
  }

  if (plan.includesPriorityBooking) perks.push('Priority Booking')
  if (plan.includesEarlyBooking) perks.push('Early Booking Access')
  if (plan.privateSessionDiscountPercent > 0) perks.push(`${plan.privateSessionDiscountPercent}% Off Private Sessions`)
  if (plan.guestPassesPerMonth > 0) perks.push(`${plan.guestPassesPerMonth} Guest Pass${plan.guestPassesPerMonth > 1 ? 'es' : ''} / Month`)
  if (plan.includesRetailDiscount) perks.push('Retail Discount')

  return (
    <ul className="space-y-1 mt-3">
      {perks.map((p, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
          <span className="text-sky-400 mt-0.5">•</span>
          {p}
        </li>
      ))}
    </ul>
  )
}

function PurchaseMembershipCard({ plan, myClient, stripeConfigured, stripeAvailable, enrolled, onPurchased, cardElementOptions }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const stripe = useStripe()
  const elements = useElements()
  const [purchaseClientMembership] = useMutation(PURCHASE_CLIENT_MEMBERSHIP)

  const savedMethods = myClient?.clientPaymentMethods || []
  const defaultSavedMethodId =
    savedMethods.find((m) => m.default)?.stripePaymentMethodId || myClient?.stripeDefaultPaymentMethodId || ''

  const [expanded, setExpanded] = useState(false)
  const [paymentChoice, setPaymentChoice] = useState('saved')
  const [selectedSavedPaymentMethodId, setSelectedSavedPaymentMethodId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!selectedSavedPaymentMethodId && defaultSavedMethodId) {
      setSelectedSavedPaymentMethodId(defaultSavedMethodId)
    }
  }, [defaultSavedMethodId, selectedSavedPaymentMethodId])

  const canUseSaved = savedMethods.length > 0
  const canUseNewCard = stripeAvailable === true

  useEffect(() => {
    if (!canUseSaved && paymentChoice === 'saved') setPaymentChoice('new')
  }, [canUseSaved, paymentChoice])

  useEffect(() => {
    if (!canUseNewCard && paymentChoice === 'new') setPaymentChoice('saved')
  }, [canUseNewCard, paymentChoice])

  const isFree = (plan.priceCents || 0) === 0

  const onSubscribe = async (e) => {
    e.preventDefault()
    try {
      if (submitting) return
      setSubmitting(true)

      let paymentMethodIdToUse = null

      if (!isFree) {
        if (!stripeConfigured) {
          throw new Error("Payments aren't configured yet. Please ask the studio owner to enable Stripe.")
        }

        if (paymentChoice === 'saved') {
          if (!canUseSaved) throw new Error('No saved card on file')
          if (!selectedSavedPaymentMethodId) throw new Error('Please choose a saved card')
          const isKnown = savedMethods.some((m) => m.stripePaymentMethodId === selectedSavedPaymentMethodId)
          if (!isKnown) throw new Error('Selected saved card is not available')
          paymentMethodIdToUse = selectedSavedPaymentMethodId
        } else {
          if (!stripe || !elements) throw new Error('Payment form is not ready yet')
          const cardElement = elements.getElement(CardElement)
          if (!cardElement) throw new Error('Payment details are missing')

          const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
            billing_details: {
              name: user?.name || undefined,
              email: normalizeStripeEmail(user?.email),
            },
          })

          if (pmError || !paymentMethod) {
            throw new Error(pmError?.message || 'Payment method could not be created')
          }

          paymentMethodIdToUse = paymentMethod.id
        }
      }

      const res = await purchaseClientMembership({
        variables: {
          membershipPlanId: plan.id,
          paymentMethodId: paymentMethodIdToUse,
        },
      })

      const payload = res.data?.purchaseClientMembership
      const errors = payload?.errors || []
      if (errors.length || !payload?.clientMembership) throw new Error(errors.join(', ') || 'Enrollment failed')

      addToast({ message: `Enrolled in ${plan.name}!`, type: 'success' })
      setExpanded(false)
      onPurchased?.()
    } catch (err) {
      addToast({ message: err.message || 'Could not enroll', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-5 transition ${
        enrolled
          ? 'border-sky-500/50 bg-sky-900/10'
          : 'border-slate-700 bg-slate-900 hover:border-slate-600'
      }`}
    >
      {enrolled && (
        <div className="text-[11px] font-semibold text-sky-400 uppercase tracking-wide">✓ Current Plan</div>
      )}
      <div className="text-base font-semibold text-slate-100">{plan.name}</div>
      <div className="text-2xl font-bold text-sky-400">
        {isFree ? 'Free' : `$${dollarsFromCents(plan.priceCents)}`}
        {!isFree && (
          <span className="text-xs font-normal text-slate-500 ml-1">/{plan.currency?.toUpperCase()}/mo</span>
        )}
      </div>
      {plan.description && <p className="text-xs text-slate-400">{plan.description}</p>}
      <PerkList plan={plan} />
      <div className="mt-auto pt-3 text-xs text-slate-500">
        {plan.minCommitmentMonths}-month commitment · {plan.autoRenew ? 'Auto-renews' : 'No auto-renew'}
      </div>

      {!enrolled && !expanded && (
        <button
          type="button"
          disabled={!stripeConfigured && !isFree}
          onClick={() => setExpanded(true)}
          className="mt-1 w-full rounded-full bg-sky-500 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Subscribe
        </button>
      )}

      {!enrolled && expanded && (
        <form onSubmit={onSubscribe} className="mt-2 space-y-3 border-t border-slate-800 pt-3">
          {!isFree && (
            <>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">Payment</div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200">
                  <input
                    type="radio"
                    name={`pay-${plan.id}`}
                    checked={paymentChoice === 'saved'}
                    disabled={!canUseSaved}
                    onChange={() => setPaymentChoice('saved')}
                  />
                  Saved card
                </label>
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200">
                  <input
                    type="radio"
                    name={`pay-${plan.id}`}
                    checked={paymentChoice === 'new'}
                    disabled={!canUseNewCard}
                    onChange={() => setPaymentChoice('new')}
                  />
                  New card
                </label>
              </div>

              {paymentChoice === 'saved' && (
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">Saved card</label>
                  <select
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    value={selectedSavedPaymentMethodId}
                    onChange={(e) => setSelectedSavedPaymentMethodId(e.target.value)}
                    disabled={!canUseSaved}
                  >
                    {!canUseSaved && <option value="">No saved card</option>}
                    {savedMethods.map((m) => (
                      <option key={m.id} value={m.stripePaymentMethodId}>
                        {(m.brand || 'card').toString().toUpperCase()} •••• {m.last4}
                        {m.default ? ' (default)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-slate-500">Manage saved cards in Profile.</div>
                </div>
              )}

              {paymentChoice === 'new' && canUseNewCard && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">Card details</label>
                  <div className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2">
                    <CardElement options={cardElementOptions} />
                  </div>
                </div>
              )}

              {paymentChoice === 'new' && !canUseNewCard && (
                <div className="text-xs text-slate-400">
                  New-card checkout is unavailable. Add a saved card in Profile, or try again later.
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
            >
              {submitting ? 'Enrolling…' : isFree ? 'Enroll' : 'Confirm & Pay'}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default function MyMembershipsPage() {
  const { user } = useAuth()
  const role = (user?.roleName || '').toString().toLowerCase()
  const isClient = role === 'client' || user?.role === 2

  const { selectedStudioId } = useStudio()
  const { addToast } = useToast()
  const { theme } = useTheme()
  const cardElementOptions = useMemo(() => getStripeCardElementOptions(theme), [theme])

  const { data: paymentSettingsData, loading: paymentSettingsLoading } = useQuery(PAYMENT_PUBLIC_SETTINGS, {
    variables: { studioId: selectedStudioId || null },
    skip: !selectedStudioId,
  })

  const stripePublishableKey = paymentSettingsData?.paymentPublicSettings?.stripePublishableKey || null
  const stripeConfigured = paymentSettingsData?.paymentPublicSettings?.configured === true

  const stripePromise = useMemo(() => {
    if (!stripePublishableKey) return null
    try { return loadStripe(stripePublishableKey) } catch { return null }
  }, [stripePublishableKey])

  const stripeAvailable = !!stripePromise

  const { data: myClientData, loading: myClientLoading, refetch: refetchMyClient } = useQuery(MY_CLIENT, {
    skip: !user || !selectedStudioId,
    variables: selectedStudioId ? { studioId: selectedStudioId } : {},
    fetchPolicy: 'cache-and-network',
  })

  const myClient = myClientData?.myClient

  const studioId = selectedStudioId || user?.studioId

  const { data: plansData, loading: plansLoading } = useQuery(MEMBERSHIP_PLANS, {
    variables: { studioId },
    skip: !studioId,
    fetchPolicy: 'cache-and-network',
  })

  const {
    data: membershipsData,
    loading: membershipsLoading,
    refetch: refetchMemberships,
  } = useQuery(CLIENT_MEMBERSHIPS, {
    skip: !user,
    fetchPolicy: 'cache-and-network',
  })

  const plans = plansData?.membershipPlans || []
  const myMemberships = membershipsData?.clientMemberships || []

  const onPurchased = async () => {
    try {
      await Promise.all([refetchMemberships?.(), refetchMyClient?.()])
    } catch (e) {
      addToast({ message: e.message || 'Could not refresh memberships', type: 'error' })
    }
  }

  if (!user) return <Navigate to="/signin" replace />

  if (!isClient) return <Navigate to="/dashboard" replace />

  const content = (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Memberships</h1>
        <p className="text-sm text-slate-400">
          Auto-renewing monthly memberships with a minimum 3-month commitment.
        </p>
      </header>

      {/* Current memberships */}
      {(membershipsLoading || myMemberships.length > 0) && (
        <section>
          <h2 className="text-base font-semibold uppercase tracking-widest text-sky-400 mb-3">My Memberships</h2>
          {membershipsLoading && <p className="text-sm text-slate-400">Loading…</p>}
          <div className="flex flex-col gap-3">
            {myMemberships.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900 p-5"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-semibold text-slate-100">{m.membershipPlan?.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[m.status] || ''}`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-sky-400">
                    ${dollarsFromCents(m.membershipPlan?.priceCents)}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      /{m.membershipPlan?.currency?.toUpperCase()}/mo
                    </span>
                  </div>
                  {m.membershipPlan && <PerkList plan={m.membershipPlan} />}
                  <div className="mt-2 text-xs text-slate-500">
                    Started {m.startedAt ? new Date(m.startedAt).toLocaleDateString() : '—'}
                    {m.endsAt && <> · Ends {new Date(m.endsAt).toLocaleDateString()}</>}
                    {m.membershipPlan?.minCommitmentMonths > 0 && (
                      <> · {m.membershipPlan.minCommitmentMonths}-month min. commitment</>
                    )}
                    {m.membershipPlan?.autoRenew && <> · Auto-renews monthly</>}
                  </div>
                  {m.notes && <p className="text-xs text-slate-400 italic">{m.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available plans */}
      <section>
        <h2 className="text-base font-semibold uppercase tracking-widest text-sky-400 mb-3">Available Plans</h2>
        {(plansLoading || paymentSettingsLoading || myClientLoading) && (
          <p className="text-sm text-slate-400">Loading…</p>
        )}
        {!plansLoading && plans.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
            No membership plans are currently available. Check back soon!
          </div>
        )}
        {!plansLoading && !stripeConfigured && plans.some((p) => (p.priceCents || 0) > 0) && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
            Payments aren't configured yet. Free plans can still be enrolled.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const enrolled = myMemberships.some(
              (m) => m.membershipPlan?.id === plan.id && m.status === 'active'
            )
            return (
              <PurchaseMembershipCard
                key={plan.id}
                plan={plan}
                myClient={myClient}
                stripeConfigured={stripeConfigured}
                stripeAvailable={stripeAvailable}
                enrolled={enrolled}
                onPurchased={onPurchased}
                cardElementOptions={cardElementOptions}
              />
            )
          })}
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Tip: you can add or change your default card in Profile.
        </div>
      </section>
    </div>
  )

  return <Elements stripe={stripePromise}>{content}</Elements>
}
