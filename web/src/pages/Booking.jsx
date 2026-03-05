import { useQuery, useMutation } from '@apollo/client'
import { Navigate, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useEffect, useMemo, useState } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  BUNDLE_PRODUCTS_FOR_CLASS_SESSION,
  CLASS_SESSIONS,
  CLIENTS,
  MY_BOOKINGS,
  MY_BUNDLE_PURCHASES,
  MY_CLIENT,
  PAYMENT_PUBLIC_SETTINGS,
} from '../apollo/queries'
import { CREATE_BOOKING_WITH_BUNDLE, CREATE_CLIENT, CREATE_BOOKING_WITH_PAYMENT } from '../apollo/mutations'
import { useToast } from '../components/ToastProvider'
import { useTheme } from '../theme/ThemeProvider'
import { getStripeCardElementOptions } from '../theme/stripeElements'
import { normalizeStripeEmail } from '../payments/stripeEmail'
import { useStudio } from '../studio/StudioProvider'
import { useAuth } from '../auth/AuthProvider'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

function BookingForm({ session, studioIdForBooking, stripeConfigured }) {
  const { id } = useParams() // classSessionId
  const navigate = useNavigate()
  const { user } = useAuth()
  const roleName = (user?.roleName || '').toString().toLowerCase()
  const isClientUser = roleName === 'client'

  const { data: myClientData } = useQuery(MY_CLIENT, {
    skip: !user,
    variables: isClientUser
      ? studioIdForBooking
        ? { studioId: studioIdForBooking }
        : {}
      : {},
  })
  const myClient = myClientData?.myClient
  const savedMethods = myClient?.clientPaymentMethods || []
  const defaultSavedMethodId =
    savedMethods.find((m) => m.default)?.stripePaymentMethodId || myClient?.stripeDefaultPaymentMethodId || null
  const [selectedSavedPaymentMethodId, setSelectedSavedPaymentMethodId] = useState('')
  const { data: clientsData } = useQuery(CLIENTS, {
    skip: !user || isClientUser,
    variables: {},
  })
  const [createClient] = useMutation(CREATE_CLIENT)
  const [createBookingWithPayment] = useMutation(CREATE_BOOKING_WITH_PAYMENT)
  const [createBookingWithBundle] = useMutation(CREATE_BOOKING_WITH_BUNDLE)
  const { register, handleSubmit, setValue } = useForm()
  const { addToast } = useToast()
  const stripe = useStripe()
  const elements = useElements()
  const [paymentChoice, setPaymentChoice] = useState('new')
  const [paymentSource, setPaymentSource] = useState('card')
  const [didAutoSelectBundle, setDidAutoSelectBundle] = useState(false)
  const [useExistingClient, setUseExistingClient] = useState(false)
  const [existingClientId, setExistingClientId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { theme } = useTheme()
  const cardElementOptions = useMemo(() => getStripeCardElementOptions(theme), [theme])

  const bookingForMyClient = !!(
    isClientUser ||
    (useExistingClient && existingClientId && myClient?.id && existingClientId === myClient.id)
  )

  const canUseSaved = bookingForMyClient && savedMethods.length > 0

  const shouldShowBundlePayments = isClientUser && session?.bundleEnabled === true

  const { data: bundleProductsData, loading: bundleProductsLoading } = useQuery(
    BUNDLE_PRODUCTS_FOR_CLASS_SESSION,
    {
      skip: !shouldShowBundlePayments,
      variables: { classSessionId: id },
      fetchPolicy: 'cache-and-network',
    },
  )

  const { data: myBundlePurchasesData, loading: myBundlePurchasesLoading } = useQuery(MY_BUNDLE_PURCHASES, {
    skip: !shouldShowBundlePayments,
    variables: studioIdForBooking ? { studioId: studioIdForBooking } : {},
    fetchPolicy: 'cache-and-network',
  })

  const eligibleBundleProductIds = useMemo(() => {
    const list = bundleProductsData?.bundleProductsForClassSession || []
    return new Set(list.map((bp) => bp?.id).filter(Boolean))
  }, [bundleProductsData])

  const eligibleBundlePurchases = useMemo(() => {
    const purchases = myBundlePurchasesData?.myBundlePurchases || []
    return purchases.filter((p) => p?.creditsRemaining > 0 && eligibleBundleProductIds.has(p?.bundleProduct?.id))
  }, [eligibleBundleProductIds, myBundlePurchasesData])

  const [selectedBundlePurchaseId, setSelectedBundlePurchaseId] = useState('')

  useEffect(() => {
    if (!selectedBundlePurchaseId && eligibleBundlePurchases.length > 0) {
      setSelectedBundlePurchaseId(eligibleBundlePurchases[0].id)
    }
  }, [eligibleBundlePurchases, selectedBundlePurchaseId])

  useEffect(() => {
    if (!shouldShowBundlePayments) return
    if (!didAutoSelectBundle && eligibleBundlePurchases.length > 0) {
      setPaymentSource('bundle')
      setDidAutoSelectBundle(true)
    }
  }, [didAutoSelectBundle, eligibleBundlePurchases.length, shouldShowBundlePayments])

  useEffect(() => {
    // If we switch to booking for a different client, saved-card selection (if any)
    // must be disabled to avoid hitting the saved-card submit path.
    if (!canUseSaved && paymentChoice !== 'new') {
      setPaymentChoice('new')
      setSelectedSavedPaymentMethodId('')
    }
  }, [canUseSaved, paymentChoice])

  const { data: myBookingsData, loading: myBookingsLoading } = useQuery(MY_BOOKINGS, {
    skip: !isClientUser,
    fetchPolicy: 'cache-and-network',
    variables: {},
  })

  const existingBooking =
    isClientUser
      ? (myBookingsData?.myBookings || []).find(
          (b) => b?.status !== 'cancelled' && b?.classSession?.id === session?.id
        )
      : null

  const existingBookingForRoute =
    isClientUser
      ? (myBookingsData?.myBookings || []).find(
          (b) => b?.status !== 'cancelled' && b?.classSession?.id?.toString() === id?.toString()
        )
      : null

  const existingBookingId = existingBookingForRoute?.id || existingBooking?.id

  useEffect(() => {
    if (!selectedSavedPaymentMethodId && defaultSavedMethodId) {
      setSelectedSavedPaymentMethodId(defaultSavedMethodId)
    }
  }, [defaultSavedMethodId, selectedSavedPaymentMethodId])

  const clients = clientsData?.clients || []

  useEffect(() => {
    if (user) {
      setValue('name', user.name || '')
      setValue('email', user.email || '')
    }
  }, [id, user, setValue])

  if (existingBookingId) {
    return <Navigate to={`/bookings/${existingBookingId}`} replace />
  }

  const onSubmit = async (form) => {
    try {
      if (submitting) return
      setSubmitting(true)

      if (!isClientUser && useExistingClient && !existingClientId) {
        throw new Error('Please select a client')
      }

      let clientIdToUse = existingClientId || null

      // Client users booking for themselves should implicitly use their own Client membership
      // when it's available (needed for saved-card flows).
      if (isClientUser && !clientIdToUse && myClient?.id) {
        clientIdToUse = myClient.id
      }

      // For client users or when no existing client is selected, create/ensure a client record
      if (!clientIdToUse) {
        if (!isClientUser) {
          const clientRes = await createClient()
          const clientPayload = clientRes.data?.createClient
          const clientErrors = clientPayload?.errors || []
          const client = clientPayload?.client
          if (clientErrors.length || !client) {
            throw new Error(clientErrors.join(', ') || 'Could not create client')
          }
          clientIdToUse = client.id
        }
      }

      let paymentMethodIdToUse = null
      if (isClientUser && paymentSource === 'bundle') {
        if (!selectedBundlePurchaseId) throw new Error('Please choose a bundle credit')

        const bookingRes = await createBookingWithBundle({
          variables: {
            clientId: null,
            classSessionId: id,
            bundlePurchaseId: selectedBundlePurchaseId,
          },
        })

        const bookingPayload = bookingRes.data?.createBookingWithBundle
        const bookingErrors = bookingPayload?.errors || []
        const booking = bookingPayload?.booking

        if (bookingErrors.length || !booking) {
          throw new Error(bookingErrors.join(', ') || 'Booking failed')
        }

        addToast({ message: 'Booking confirmed', type: 'success' })
        navigate('/dashboard')
        return
      }

      if (!stripeConfigured) {
        throw new Error('Payments are not configured for this studio')
      }

      if (paymentChoice === 'saved') {
        if (!canUseSaved) {
          throw new Error('Saved card can only be used when booking for your own profile')
        }
        if (!savedMethods.length) throw new Error('No saved card on file')

        // Saved cards are stored on *your* Client record; only allow when booking for that client.
        if (myClient?.id && clientIdToUse !== myClient.id) {
          throw new Error('Saved card can only be used when booking for your own profile')
        }

        if (!selectedSavedPaymentMethodId) throw new Error('Please choose a saved card')
        const isKnown = savedMethods.some((m) => m.stripePaymentMethodId === selectedSavedPaymentMethodId)
        if (!isKnown) throw new Error('Selected saved card is not available')

        paymentMethodIdToUse = selectedSavedPaymentMethodId
      } else {
        if (!stripe || !elements) {
          throw new Error('Payment form is not ready yet')
        }

        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
          throw new Error('Payment details are missing')
        }

        const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: form.name,
            email: normalizeStripeEmail(form.email),
          },
        })

        if (pmError || !paymentMethod) {
          throw new Error(pmError?.message || 'Payment method could not be created')
        }

        paymentMethodIdToUse = paymentMethod.id
      }

      const bookingRes = await createBookingWithPayment({
        variables: {
          clientId: clientIdToUse,
          classSessionId: id,
          paymentMethodId: paymentMethodIdToUse,
        },
      })

      const bookingPayload = bookingRes.data?.createBookingWithPayment
      const bookingErrors = bookingPayload?.errors || []
      const booking = bookingPayload?.booking

      if (bookingErrors.length || !booking) {
        throw new Error(bookingErrors.join(', ') || 'Booking failed')
      }

      addToast({ message: 'Booking confirmed', type: 'success' })
      navigate('/dashboard')
    } catch (e) {
      addToast({ message: e.message || 'Booking failed', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!session) return <div>Loading session...</div>

  if (isClientUser && myBookingsLoading) {
    return <div className="p-6 text-sm text-slate-300">Checking booking status…</div>
  }

  if (existingBooking?.id) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold text-slate-50">You’re already booked for this class.</div>
        <div className="mt-2 text-sm text-slate-400">Opening your booking…</div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate(`/bookings/${existingBooking.id}`)}
            className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400"
          >
            View booking
          </button>
        </div>
      </div>
    )
  }

  const currency = (session.classTemplate?.currency || 'cad').toLowerCase()
  const currencyLabel = currency.toUpperCase()
  const currencySymbol = currency === 'usd' ? '$' : 'CA$'

  const priceDollars = session.classTemplate?.priceCents
    ? (session.classTemplate.priceCents / 100).toFixed(2)
    : null

  const showBundleOption = shouldShowBundlePayments
  const canPayWithBundle = eligibleBundlePurchases.length > 0
  const loadingBundleData = bundleProductsLoading || myBundlePurchasesLoading

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-50">Book session</h2>
        <p className="text-sm text-slate-400">Confirm a client into this class.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm"
        >
        {clients.length > 0 && !isClientUser && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">Client</label>
            <div className="flex flex-col gap-1 text-xs text-slate-300">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  className="h-3 w-3"
                  checked={useExistingClient}
                  onChange={() => setUseExistingClient(true)}
                />
                <span>Existing client</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  className="h-3 w-3"
                  checked={!useExistingClient}
                  onChange={() => setUseExistingClient(false)}
                />
                <span>New client</span>
              </label>
            </div>
            {useExistingClient && (
              <select
                value={existingClientId}
                onChange={(e) => setExistingClientId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email || 'Client'}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300">Name</label>
          <input
            {...register('name')}
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300">Email</label>
          <input
            {...register('email')}
            type="email"
            required
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300">Phone</label>
          <input
            {...register('phone')}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300">Payment</label>

          {isClientUser && showBundleOption && (
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-slate-200">Payment source</div>
                {loadingBundleData && <span className="text-[11px] text-slate-500">Loading bundle credits…</span>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentSource"
                    className="h-3 w-3"
                    checked={paymentSource === 'card'}
                    onChange={() => setPaymentSource('card')}
                  />
                  <span>Card</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentSource"
                    className="h-3 w-3"
                    checked={paymentSource === 'bundle'}
                    disabled={!canPayWithBundle}
                    onChange={() => setPaymentSource('bundle')}
                  />
                  <span>Bundle credits</span>
                  {!loadingBundleData && !canPayWithBundle && (
                    <span className="text-[11px] text-slate-500">(no eligible credits)</span>
                  )}
                </label>
              </div>

              {paymentSource === 'bundle' && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-400">Choose credits</label>
                  <select
                    value={selectedBundlePurchaseId}
                    onChange={(e) => setSelectedBundlePurchaseId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    disabled={!canPayWithBundle}
                  >
                    {!canPayWithBundle && <option value="">No eligible bundle credits</option>}
                    {eligibleBundlePurchases.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.bundleProduct?.title || 'Bundle'} — {p.creditsRemaining} credits remaining
                      </option>
                    ))}
                  </select>
                  {!canPayWithBundle && (
                    <div className="text-[11px] text-slate-500">
                      <button
                        type="button"
                        onClick={() => navigate('/my-bundles')}
                        className="underline decoration-slate-600 underline-offset-2 hover:text-slate-300"
                      >
                        Buy bundle credits
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(paymentSource !== 'bundle') && (
            <>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-300">
                <div className="font-semibold text-slate-200">Secure payment</div>
                <div className="mt-0.5 text-slate-400">
                  Card details are sent directly to Stripe for processing. We don’t store your full card number.
                </div>
              </div>

              {!stripeConfigured && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Payments aren’t configured yet for this studio.
                </div>
              )}
            </>
          )}

          {stripeConfigured && canUseSaved && (paymentSource !== 'bundle') && (
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-200">
              <div className="flex flex-col gap-1">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentChoice"
                    className="h-3 w-3"
                    checked={paymentChoice === 'saved'}
                    onChange={() => setPaymentChoice('saved')}
                  />
                  <span>Use a saved card</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="paymentChoice"
                    className="h-3 w-3"
                    checked={paymentChoice === 'new'}
                    onChange={() => setPaymentChoice('new')}
                  />
                  <span>Use a different card</span>
                </label>
              </div>

              {paymentChoice === 'saved' && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-400">Saved card</label>
                  <select
                    value={selectedSavedPaymentMethodId}
                    onChange={(e) => setSelectedSavedPaymentMethodId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    {savedMethods.map((m) => (
                      <option key={m.id} value={m.stripePaymentMethodId}>
                        {(m.brand || 'card').toString().toUpperCase()} •••• {m.last4 || '••••'}
                        {m.expMonth && m.expYear ? ` (exp ${String(m.expMonth).padStart(2, '0')}/${String(m.expYear).slice(-2)})` : ''}
                        {m.default ? ' — default' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">Manage saved cards in Profile.</p>
                </div>
              )}
            </div>
          )}

          {stripeConfigured && (paymentSource !== 'bundle') && (!canUseSaved || paymentChoice === 'new') && (
            <>
              <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
                <CardElement
                  key={`card-${theme}`}
                  options={cardElementOptions}
                />
              </div>
              {import.meta.env.DEV && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Test mode: use 4242 4242 4242 4242 with any future expiry and CVC.
                </p>
              )}
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={submitting || (paymentSource !== 'bundle' && !stripeConfigured) || (paymentSource === 'bundle' && !canPayWithBundle)}
          className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {paymentSource === 'bundle'
            ? 'Book using bundle credits'
            : (priceDollars ? `Pay ${currencySymbol}${priceDollars} ${currencyLabel} & book` : 'Confirm booking')}
        </button>
        </form>
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm">
          <h2 className="text-sm font-semibold text-slate-50">
            {submitting
              ? 'Processing…'
              : priceDollars
                ? `Pay ${currencySymbol}${priceDollars} ${currencyLabel} & book`
                : 'Confirm booking'}
          </h2>
          <div className="mt-3 space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Class</span>
              <span className="font-medium text-slate-100">{session.classTemplate?.title || 'Session'}</span>
            </div>
            <div className="flex justify-between">
              <span>Date &amp; time</span>
              <span>{new Date(session.startTime).toLocaleString()}</span>
            </div>
            {session.instructor?.name && (
              <div className="flex justify-between">
                <span>Instructor</span>
                <span>{session.instructor.name}</span>
              </div>
            )}
            {session.classTemplate?.durationMinutes && (
              <div className="flex justify-between">
                <span>Duration</span>
                <span>{session.classTemplate.durationMinutes} min</span>
              </div>
            )}
            {session.room && (
              <div className="flex justify-between">
                <span>Room</span>
                <span>{session.room}</span>
              </div>
            )}
            {typeof session.seatsAvailable === 'number' && (
              <div className="flex justify-between">
                <span>Spots remaining</span>
                <span
                  className={
                    session.seatsAvailable <= 0
                      ? 'font-semibold text-amber-300'
                      : session.seatsAvailable <= 3
                        ? 'font-semibold text-amber-200'
                        : 'text-emerald-300'
                  }
                >
                  {session.seatsAvailable <= 0
                    ? 'Full — joining waitlist'
                    : `${session.seatsAvailable} spot${session.seatsAvailable !== 1 ? 's' : ''}`}
                </span>
              </div>
            )}
            {priceDollars && (
              <>
                <div className="mt-2 h-px bg-slate-800" />
                <div className="flex justify-between text-sm font-semibold text-slate-50">
                  <span>Total</span>
                  <span>{currencyLabel} {priceDollars}</span>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function Booking() {
  const { id } = useParams()
  const location = useLocation()
  const { user } = useAuth()
  const roleName = (user?.roleName || '').toString().toLowerCase()
  const isClientUser = roleName === 'client'
  const { selectedStudioId } = useStudio()

  useDocumentTitle('Book session')

  const studioIdForBooking = location?.state?.studioId || selectedStudioId

  const { data: myBookingsData, loading: myBookingsLoading } = useQuery(MY_BOOKINGS, {
    skip: !isClientUser,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    variables: {},
  })

  const existingBookingForRoute =
    isClientUser
      ? (myBookingsData?.myBookings || []).find(
          (b) => b?.status !== 'cancelled' && b?.classSession?.id?.toString() === id?.toString()
        )
      : null

  const redirectTarget = existingBookingForRoute?.id ? `/bookings/${existingBookingForRoute.id}` : null
  const shouldRedirectNow = !!(redirectTarget && location?.pathname !== redirectTarget)
  const redirectingToExistingBooking = !!redirectTarget

  const shouldHoldQueriesForRedirectCheck = isClientUser && myBookingsLoading

  const { data: sessionsData } = useQuery(CLASS_SESSIONS, {
    skip: redirectingToExistingBooking || shouldHoldQueriesForRedirectCheck,
    variables: isClientUser
      ? studioIdForBooking
        ? { from: null, to: null, studioId: studioIdForBooking }
        : { from: null, to: null }
      : { from: null, to: null },
  })

  const { data: paymentPublicSettingsData } = useQuery(PAYMENT_PUBLIC_SETTINGS, {
    skip: redirectingToExistingBooking || shouldHoldQueriesForRedirectCheck,
    variables: isClientUser
      ? studioIdForBooking
        ? { studioId: studioIdForBooking }
        : {}
      : {},
  })

  const session = (sessionsData?.classSessions || []).find((s) => s.id === id)
  const stripePublishableKey = paymentPublicSettingsData?.paymentPublicSettings?.stripePublishableKey
  const stripeConfigured = paymentPublicSettingsData?.paymentPublicSettings?.configured === true

  const stripePromise = useMemo(() => (
    stripePublishableKey ? loadStripe(stripePublishableKey) : null
  ), [stripePublishableKey])

  if (shouldRedirectNow) {
    return <Navigate to={redirectTarget} replace />
  }

  if (shouldHoldQueriesForRedirectCheck) return <div>Loading booking…</div>

  if (!session) return <div>Loading session...</div>

  return (
    <Elements stripe={stripePromise}>
      <BookingForm session={session} studioIdForBooking={studioIdForBooking} stripeConfigured={stripeConfigured} />
    </Elements>
  )
}
