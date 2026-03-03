import { useMutation, useQuery } from '@apollo/client'
import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { MY_BOOKINGS, MY_CLIENT, PAYMENT_PUBLIC_SETTINGS, CLIENT_MEMBERSHIPS } from '../apollo/queries'
import {
  CREATE_SETUP_INTENT,
  REMOVE_MY_PAYMENT_METHOD,
  SAVE_MY_PAYMENT_METHOD,
  SET_MY_DEFAULT_PAYMENT_METHOD,
  UPDATE_PROFILE,
  UPDATE_CLIENT_MEMBERSHIP,
} from '../apollo/mutations'
import { useToast } from '../components/ToastProvider'
import { useAuth } from '../auth/AuthProvider'
import { useTheme } from '../theme/ThemeProvider'
import { normalizeStripeEmail } from '../payments/stripeEmail'
import { useStudio } from '../studio/StudioProvider'
import { getStripeCardElementOptions } from '../theme/stripeElements'

function formatMoney(cents, currency) {
  const amount = (Number(cents) || 0) / 100
  const c = (currency || 'cad').toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(amount)
  } catch {
    return `${c} ${amount.toFixed(2)}`
  }
}

export default function Profile() {
  const auth = useAuth()
  const { addToast } = useToast()
  const user = auth.user
  const role = (user?.roleName || '').toString().toLowerCase()
  const isClient = role === 'client'
  const { selectedStudioId } = useStudio()

  const [updateProfile, { loading: savingProfile }] = useMutation(UPDATE_PROFILE)
  const [form, setForm] = useState({ name: '', email: '', currentPassword: '', password: '', passwordConfirmation: '' })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm((f) => ({
      ...f,
      name: user.name || '',
      email: user.email || '',
    }))
  }, [user])

  const emailChanged = useMemo(() => {
    if (!user) return false
    return (form.email || '').trim() !== (user.email || '').trim()
  }, [form.email, user])

  const wantsPasswordChange = !!(form.password || form.passwordConfirmation)
  const requiresCurrentPassword = emailChanged || wantsPasswordChange

  const saveProfile = async (e) => {
    e.preventDefault()

    if (!user) return

    if (wantsPasswordChange && form.password !== form.passwordConfirmation) {
      addToast({ message: 'Password confirmation does not match', type: 'error' })
      return
    }

    if (requiresCurrentPassword && !form.currentPassword) {
      addToast({ message: 'Current password is required to change email or password', type: 'error' })
      return
    }

    const nextName = (form.name || '').trim()
    const nextEmail = (form.email || '').trim()

    const variables = {
      name: nextName !== (user.name || '') ? nextName : undefined,
      email: nextEmail !== (user.email || '') ? nextEmail : undefined,
      password: form.password ? form.password : undefined,
      passwordConfirmation: form.passwordConfirmation ? form.passwordConfirmation : undefined,
      currentPassword: requiresCurrentPassword ? form.currentPassword : undefined,
    }

    try {
      const res = await updateProfile({ variables })
      const payload = res.data?.updateProfile
      const errors = payload?.errors || []
      if (errors.length || !payload?.user) throw new Error(errors.join(', ') || 'Update failed')

      addToast({ message: 'Profile updated', type: 'success' })
      setDirty(false)
      setForm((f) => ({ ...f, currentPassword: '', password: '', passwordConfirmation: '' }))
      try {
        await auth.refetch?.()
      } catch {
        // ignore
      }
    } catch (err) {
      addToast({ message: err.message || 'Update failed', type: 'error' })
    }
  }

  const { data: myBookingsData, loading: myBookingsLoading } = useQuery(MY_BOOKINGS, {
    skip: !user,
    variables: { studioLocationId: null },
  })

  const { data: myClientData, loading: myClientLoading, refetch: refetchMyClient } = useQuery(MY_CLIENT, {
    skip: !user || (isClient && !selectedStudioId),
    variables: isClient ? { studioId: selectedStudioId } : undefined,
  })

  const { data: paymentPublicSettingsData } = useQuery(PAYMENT_PUBLIC_SETTINGS, {
    skip: !user || (isClient && !selectedStudioId),
    variables: isClient ? { studioId: selectedStudioId } : undefined,
  })

  const myClient = myClientData?.myClient

  const stripePublishableKey = paymentPublicSettingsData?.paymentPublicSettings?.stripePublishableKey
  const stripePromise = useMemo(() => (
    stripePublishableKey ? loadStripe(stripePublishableKey) : null
  ), [stripePublishableKey])

  const { data: clientMembershipsData, loading: membershipsLoading, refetch: refetchMemberships } = useQuery(CLIENT_MEMBERSHIPS, {
    skip: !user || !isClient,
    fetchPolicy: 'cache-and-network',
  })
  const clientMemberships = clientMembershipsData?.clientMemberships || []
  const activeMemberships = clientMemberships.filter((m) => m.status === 'active')

  const [updateClientMembership, { loading: cancellingMembership }] = useMutation(UPDATE_CLIENT_MEMBERSHIP)

  const cancelMembership = async (id) => {
    if (!window.confirm('Cancel this membership? This cannot be undone.')) return
    try {
      const res = await updateClientMembership({ variables: { id, status: 'cancelled' } })
      const payload = res.data?.updateClientMembership
      const errors = payload?.errors || []
      if (errors.length) throw new Error(errors.join(', '))
      addToast({ message: 'Membership cancelled', type: 'success' })
      refetchMemberships?.()
    } catch (err) {
      addToast({ message: err.message || 'Could not cancel membership', type: 'error' })
    }
  }

  const [createSetupIntent, { loading: creatingSetupIntent }] = useMutation(CREATE_SETUP_INTENT)
  const [saveMyPaymentMethod, { loading: savingCard }] = useMutation(SAVE_MY_PAYMENT_METHOD)
  const [removeMyPaymentMethod, { loading: removingCard }] = useMutation(REMOVE_MY_PAYMENT_METHOD)
  const [setMyDefaultPaymentMethod, { loading: settingDefaultCard }] = useMutation(
    SET_MY_DEFAULT_PAYMENT_METHOD,
  )

  if (!user) return <Navigate to="/signin" replace />

  const myBookings = myBookingsData?.myBookings || []

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Profile</h1>
        <p className="text-sm text-slate-400">
          Update your personal information and review billing activity.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/50">
        <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Profile details</h2>
        <form onSubmit={saveProfile} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Name</label>
            <input
              value={form.name}
              onChange={(e) => {
                setDirty(true)
                setForm((f) => ({ ...f, name: e.target.value }))
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Email</label>
            <input
              value={form.email}
              onChange={(e) => {
                setDirty(true)
                setForm((f) => ({ ...f, email: e.target.value }))
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              placeholder="you@example.com"
              type="email"
              required
            />
            <p className="text-[11px] text-slate-500">Changing email requires your current password.</p>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">New password</label>
            <input
              value={form.password}
              onChange={(e) => {
                setDirty(true)
                setForm((f) => ({ ...f, password: e.target.value }))
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              type="password"
              placeholder="Leave blank to keep current"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Confirm new password</label>
            <input
              value={form.passwordConfirmation}
              onChange={(e) => {
                setDirty(true)
                setForm((f) => ({ ...f, passwordConfirmation: e.target.value }))
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              type="password"
              placeholder="Confirm new password"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[11px] font-medium text-slate-300">Current password</label>
            <input
              value={form.currentPassword}
              onChange={(e) => {
                setDirty(true)
                setForm((f) => ({ ...f, currentPassword: e.target.value }))
              }}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              type="password"
              placeholder={requiresCurrentPassword ? 'Required for this change' : 'Only required when changing email or password'}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={savingProfile || !dirty}
              className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>

      {isClient && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/50">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Memberships</h2>
            <a
              href="/my-memberships"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              Browse plans →
            </a>
          </div>

          {membershipsLoading && <p className="mt-2 text-sm text-slate-400">Loading…</p>}

          {!membershipsLoading && activeMemberships.length === 0 && (
            <p className="mt-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
              No active memberships.{' '}
              <a href="/my-memberships" className="text-sky-400 hover:underline">Browse available plans →</a>
            </p>
          )}

          {!membershipsLoading && activeMemberships.length > 0 && (
            <div className="mt-3 flex flex-col gap-3">
              {activeMemberships.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-900/10 p-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">{m.membershipPlan?.name}</span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                        {m.status}
                      </span>
                    </div>
                    <div className="text-base font-bold text-sky-400">
                      ${((m.membershipPlan?.priceCents || 0) / 100).toFixed(2)}
                      <span className="text-xs font-normal text-slate-500 ml-1">
                        /{m.membershipPlan?.currency?.toUpperCase()}/mo
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Started {m.startedAt ? new Date(m.startedAt).toLocaleDateString() : '—'}
                      {m.endsAt && <> · Ends {new Date(m.endsAt).toLocaleDateString()}</>}
                      {m.membershipPlan?.autoRenew && <> · Auto-renews monthly</>}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={cancellingMembership}
                    onClick={() => cancelMembership(m.id)}
                    className="shrink-0 rounded-full border border-rose-500/40 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl shadow-black/50">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Billing</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-slate-100">Saved card</h3>

            {(myClientLoading || creatingSetupIntent) && (
              <p className="mt-2 text-sm text-slate-400">Loading…</p>
            )}

            {!myClientLoading && !stripePublishableKey && (
              <p className="mt-2 text-sm text-amber-400">
                Payments aren’t configured yet. Please ask the studio owner to enable Stripe.
              </p>
            )}

            {!myClientLoading && stripePublishableKey && stripePromise && (
              <Elements stripe={stripePromise}>
                <SavedCardEditor
                  user={user}
                  myClient={myClient}
                  creatingSetupIntent={creatingSetupIntent}
                  savingCard={savingCard}
                  removingCard={removingCard}
                  settingDefaultCard={settingDefaultCard}
                  createSetupIntent={createSetupIntent}
                  saveMyPaymentMethod={saveMyPaymentMethod}
                  removeMyPaymentMethod={removeMyPaymentMethod}
                  setMyDefaultPaymentMethod={setMyDefaultPaymentMethod}
                  onUpdated={() => refetchMyClient?.()}
                  addToast={addToast}
                />
              </Elements>
            )}
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-100">Transaction history</h3>
            <p className="mt-1 text-sm text-slate-400">Recent charges from your bookings.</p>

            {myBookingsLoading && <p className="mt-2 text-sm text-slate-400">Loading transactions…</p>}

            {!myBookingsLoading && myBookings.length === 0 && (
              <p className="mt-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                No transactions yet.
              </p>
            )}

            {!myBookingsLoading && myBookings.length > 0 && (
              <div className="mt-3 overflow-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-left text-sm text-slate-200">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myBookings.slice(0, 15).map((b) => (
                      <tr key={b.id} className="border-t border-slate-800">
                        <td className="px-3 py-2 text-xs text-slate-400">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-sm text-slate-50">{b.classSession?.classTemplate?.title || 'Class'}</div>
                          <div className="text-xs text-slate-500">
                            {b.classSession?.startTime ? new Date(b.classSession.startTime).toLocaleString() : ''}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-200">
                          {b.payment
                            ? formatMoney(b.payment.amountCents, b.payment.currency)
                            : formatMoney(b.priceCents, 'cad')}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {b.payment ? (
                            <span
                              className={`rounded-full px-2 py-0.5 ${b.payment.status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}
                            >
                              {b.payment.status}
                            </span>
                          ) : (
                            <span
                              className={`rounded-full px-2 py-0.5 ${b.paid ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}
                            >
                              {b.paid ? 'paid' : 'unpaid'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function SavedCardEditor({
  user,
  myClient,
  creatingSetupIntent,
  savingCard,
  removingCard,
  settingDefaultCard,
  createSetupIntent,
  saveMyPaymentMethod,
  removeMyPaymentMethod,
  setMyDefaultPaymentMethod,
  onUpdated,
  addToast,
}) {
  const role = (user?.roleName || '').toString().toLowerCase()
  const isClient = role === 'client'
  const { selectedStudioId } = useStudio()

  const stripe = useStripe()
  const elements = useElements()
  const [showAddForm, setShowAddForm] = useState(false)

  const { theme } = useTheme()
  const cardElementOptions = useMemo(() => getStripeCardElementOptions(theme), [theme])
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  })

  const paymentMethods = myClient?.clientPaymentMethods || []
  const hasSaved = paymentMethods.length > 0

  const onSave = async (e) => {
    e.preventDefault()
    try {
      if (!stripe || !elements) throw new Error('Payment form is not ready yet')
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error('Payment details are missing')

      const res = await createSetupIntent({ variables: { studioId: isClient ? selectedStudioId : null } })
      const payload = res.data?.createSetupIntent
      const errors = payload?.errors || []
      const clientSecret = payload?.clientSecret
      if (errors.length || !clientSecret) throw new Error(errors.join(', ') || 'Could not start card setup')

      const confirmRes = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: user?.name || undefined,
            email: normalizeStripeEmail(user?.email),
            address: {
              line1: address.line1 || undefined,
              line2: address.line2 || undefined,
              city: address.city || undefined,
              state: address.state || undefined,
              postal_code: address.postalCode || undefined,
              country: address.country || undefined,
            },
          },
        },
      })

      if (confirmRes.error) throw new Error(confirmRes.error.message || 'Card setup failed')
      const pm = confirmRes.setupIntent?.payment_method
      const paymentMethodId = typeof pm === 'string' ? pm : pm?.id
      if (!paymentMethodId) throw new Error('No payment method returned')

      const saveRes = await saveMyPaymentMethod({
        variables: { paymentMethodId, studioId: isClient ? selectedStudioId : null },
      })
      const savePayload = saveRes.data?.saveMyPaymentMethod
      const saveErrors = savePayload?.errors || []
      if (saveErrors.length) throw new Error(saveErrors.join(', ') || 'Could not save card')

      addToast({ message: 'Card saved', type: 'success' })
      setShowAddForm(false)
      onUpdated?.()
    } catch (err) {
      addToast({ message: err.message || 'Could not save card', type: 'error' })
    }
  }

  const onMakeDefault = async (paymentMethodId) => {
    try {
      const res = await setMyDefaultPaymentMethod({
        variables: { paymentMethodId, studioId: isClient ? selectedStudioId : null },
      })
      const payload = res.data?.setMyDefaultPaymentMethod
      const errors = payload?.errors || []
      if (errors.length) throw new Error(errors.join(', ') || 'Could not set default')
      addToast({ message: 'Default card updated', type: 'success' })
      onUpdated?.()
    } catch (err) {
      addToast({ message: err.message || 'Could not set default', type: 'error' })
    }
  }

  const onRemove = async (paymentMethodId) => {
    try {
      const res = await removeMyPaymentMethod({
        variables: { paymentMethodId, studioId: isClient ? selectedStudioId : null },
      })
      const payload = res.data?.removeMyPaymentMethod
      const errors = payload?.errors || []
      if (errors.length) throw new Error(errors.join(', ') || 'Could not remove card')
      addToast({ message: 'Card removed', type: 'success' })
      onUpdated?.()
    } catch (err) {
      addToast({ message: err.message || 'Could not remove card', type: 'error' })
    }
  }

  const formatPm = (pm) => {
    const brand = (pm.brand || 'card').toString().toUpperCase()
    const last4 = pm.last4 || '••••'
    const exp = pm.expMonth && pm.expYear
      ? ` (exp ${String(pm.expMonth).padStart(2, '0')}/${String(pm.expYear).slice(-2)})`
      : ''
    return `${brand} •••• ${last4}${exp}`
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      {hasSaved ? (
        <div className="space-y-3">
          <div className="space-y-2">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="text-slate-100">{formatPm(pm)}</div>
                  {pm.default && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!pm.default && (
                    <button
                      type="button"
                      disabled={settingDefaultCard}
                      onClick={() => onMakeDefault(pm.stripePaymentMethodId)}
                      className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                    >
                      Make default
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={removingCard}
                    onClick={() => {
                      if (!window.confirm('Remove this saved card?')) return
                      onRemove(pm.stripePaymentMethodId)
                    }}
                    className="inline-flex items-center rounded-full border border-rose-500/40 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!showAddForm && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Add another card
              </button>
            </div>
          )}

          {showAddForm && (
            <form onSubmit={onSave} className="space-y-3">
              <div className="text-sm text-slate-200">Add a new card</div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-300">
                <div className="font-semibold text-slate-200">Secure storage</div>
                <div className="mt-0.5 text-slate-400">
                  Card details are sent directly to Stripe. We don’t store your full card number.
                </div>
              </div>
              <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
                <CardElement key={`card-${theme}`} options={cardElementOptions} />
              </div>

              <BillingAddressFields address={address} setAddress={setAddress} />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSetupIntent || savingCard}
                  className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400 disabled:opacity-60"
                >
                  {savingCard ? 'Saving…' : 'Save card'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <form onSubmit={onSave} className="space-y-3">
          <div className="text-sm text-slate-200">Add a card</div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-300">
            <div className="font-semibold text-slate-200">Secure storage</div>
            <div className="mt-0.5 text-slate-400">
              Card details are sent directly to the Payment Processor (Stripe). We don’t store your full card number.
            </div>
          </div>
          <div className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
            <CardElement key={`card-${theme}`} options={cardElementOptions} />
          </div>

          <BillingAddressFields address={address} setAddress={setAddress} />

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={creatingSetupIntent || savingCard}
              className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400 disabled:opacity-60"
            >
              {savingCard ? 'Saving…' : 'Save card'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function BillingAddressFields({ address, setAddress }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      <div className="space-y-1 md:col-span-2">
        <label className="text-[11px] font-medium text-slate-300">Billing address (optional)</label>
        <input
          value={address.line1}
          onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          placeholder="Address line 1"
          autoComplete="billing address-line1"
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <input
          value={address.line2}
          onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          placeholder="Address line 2"
          autoComplete="billing address-line2"
        />
      </div>
      <div className="space-y-1">
        <input
          value={address.city}
          onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          placeholder="City"
          autoComplete="billing address-level2"
        />
      </div>
      <div className="space-y-1">
        <input
          value={address.state}
          onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          placeholder="State / Province"
          autoComplete="billing address-level1"
        />
      </div>
      <div className="space-y-1">
        <input
          value={address.postalCode}
          onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          placeholder="Postal code"
          autoComplete="billing postal-code"
        />
      </div>
      <div className="space-y-1">
        <input
          value={address.country}
          onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm uppercase text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          placeholder="Country (e.g. CA)"
          autoComplete="billing country"
        />
      </div>
    </div>
  )
}
