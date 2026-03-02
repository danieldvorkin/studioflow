import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { BOOKINGS, CURRENT_USER, MY_BOOKINGS, MY_CLIENT, PAYMENT_PUBLIC_SETTINGS } from '../apollo/queries'
import {
  CANCEL_BOOKING,
  ARCHIVE_BOOKING,
  REBOOK_BOOKING_WITH_PAYMENT,
  CREATE_BOOKING_CHECKOUT_SESSION,
  CONFIRM_BOOKING_CHECKOUT_PAYMENT,
  SEND_BOOKING_PAYMENT_REMINDER,
} from '../apollo/mutations'
import { useToast } from '../components/ToastProvider'
import { useTheme } from '../theme/ThemeProvider'
import { getStripeCardElementOptions } from '../theme/stripeElements'
import { redirectToExternalUrl } from '../payments/redirectToExternalUrl'

function RebookCheckoutForm({
  booking,
  currencyLabel,
  currencySymbol,
  onClose,
  onSuccess,
  canUseSavedCard,
  savedMethods,
  defaultSavedMethodId,
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [rebookWithPayment] = useMutation(REBOOK_BOOKING_WITH_PAYMENT)
  const { addToast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [paymentChoice, setPaymentChoice] = useState('new')
  const [selectedSavedPaymentMethodId, setSelectedSavedPaymentMethodId] = useState('')

  const { theme } = useTheme()
  const cardElementOptions = useMemo(() => getStripeCardElementOptions(theme), [theme])

  useEffect(() => {
    if (!selectedSavedPaymentMethodId && defaultSavedMethodId) {
      setSelectedSavedPaymentMethodId(defaultSavedMethodId)
    }
  }, [defaultSavedMethodId, selectedSavedPaymentMethodId])

  const canUseSaved = !!(canUseSavedCard && savedMethods?.length)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (submitting) return
      setSubmitting(true)

      let paymentMethodIdToUse = null
      if (paymentChoice === 'saved') {
        if (!canUseSaved) throw new Error('Saved card is not available for this booking')
        if (!selectedSavedPaymentMethodId) throw new Error('Please choose a saved card')

        const isKnown = (savedMethods || []).some(
          (m) => m.stripePaymentMethodId === selectedSavedPaymentMethodId,
        )
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
        })

        if (pmError || !paymentMethod) {
          throw new Error(pmError?.message || 'Payment method could not be created')
        }

        paymentMethodIdToUse = paymentMethod.id
      }

      const res = await rebookWithPayment({
        variables: {
          id: booking.id,
          paymentMethodId: paymentMethodIdToUse,
        },
      })

      const payload = res.data?.rebookBookingWithPayment
      const errors = payload?.errors || []
      if (errors.length || !payload?.booking) {
        throw new Error(errors.join(', ') || 'Rebooking failed')
      }

      addToast({ message: 'Booking re-booked and payment confirmed', type: 'success' })
      onSuccess()
    } catch (err) {
      addToast({ message: err.message || 'Rebooking failed', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const amountCents = booking.priceCents
  const amount = amountCents ? (amountCents / 100).toFixed(2) : null

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm shadow-xl shadow-black/60"
    >
      <h3 className="text-sm font-semibold text-slate-50">Confirm payment to re-book</h3>
      {amount && (
        <p className="text-xs text-slate-300">
          You will be charged {currencySymbol}
          {amount} {currencyLabel} to re-book this class.
        </p>
      )}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-300">Payment</label>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-300">
          <div className="font-semibold text-slate-200">Secure payment</div>
          <div className="mt-0.5 text-slate-400">
            Card details are sent directly to Stripe for processing. We don’t store your full card number.
          </div>
        </div>

        {canUseSaved && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-200">
            <div className="flex flex-col gap-1">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  className="h-3 w-3"
                  checked={paymentChoice === 'saved'}
                  onChange={() => setPaymentChoice('saved')}
                />
                <span>Use a saved card</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  className="h-3 w-3"
                  checked={paymentChoice === 'new'}
                  onChange={() => setPaymentChoice('new')}
                />
                <span>Use a different card</span>
              </label>

              {paymentChoice === 'saved' && (
                <div className="mt-2 space-y-1">
                  <label className="block text-[11px] font-medium text-slate-400">Saved card</label>
                  <select
                    value={selectedSavedPaymentMethodId}
                    onChange={(e) => setSelectedSavedPaymentMethodId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    {(savedMethods || []).map((m) => (
                      <option key={m.id} value={m.stripePaymentMethodId}>
                        {(m.brand || 'card').toString().toUpperCase()} •••• {m.last4 || '••••'}
                        {m.expMonth && m.expYear ? ` (exp ${String(m.expMonth).padStart(2, '0')}/${String(m.expYear).slice(-2)})` : ''}
                        {m.default ? ' — default' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {(!canUseSaved || paymentChoice === 'new') && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
            <CardElement
              key={`card-${theme}`}
              options={cardElementOptions}
            />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-xs">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-600 px-3 py-1 text-slate-200 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-medium text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Processing…' : 'Confirm & pay'}
        </button>
      </div>
    </form>
  )
}

export default function BookingShow() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: userData } = useQuery(CURRENT_USER)
  const user = userData?.currentUser
  const role = (user?.roleName || '').toString().toLowerCase()
  const isClient = role === 'client'
  const isInstructor = role === 'instructor'
  const isOwner = role === 'owner' || user?.role === 0
  const isStaff = role === 'staff' || user?.role === 1

  const { data: bookingsData, loading: bookingsLoading } = useQuery(BOOKINGS, {
    skip: !user || isClient,
    variables: {},
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  })

  const { data: myBookingsData, loading: myBookingsLoading } = useQuery(MY_BOOKINGS, {
    skip: !user || !isClient,
    variables: {},
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  })

  const bookingList = isClient ? (myBookingsData?.myBookings || []) : (bookingsData?.bookings || [])
  const booking = bookingList.find((b) => b.id === id)
  const bookingStudioId = booking?.studioId || null

  const { data: paymentPublicSettingsData } = useQuery(PAYMENT_PUBLIC_SETTINGS, {
    skip: !bookingStudioId,
    variables: { studioId: bookingStudioId },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  })

  const { data: myClientData } = useQuery(MY_CLIENT, {
    skip: !isClient || !bookingStudioId,
    variables: { studioId: bookingStudioId },
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  })
  const [cancelBooking] = useMutation(CANCEL_BOOKING)
  const [archiveBooking] = useMutation(ARCHIVE_BOOKING)
  const [createCheckoutSession, { loading: creatingCheckout }] = useMutation(CREATE_BOOKING_CHECKOUT_SESSION)
  const [confirmCheckoutPayment] = useMutation(CONFIRM_BOOKING_CHECKOUT_PAYMENT)
  const [sendPaymentReminder, { loading: sendingReminder }] = useMutation(SEND_BOOKING_PAYMENT_REMINDER)
  const { addToast } = useToast()

  const [showRebookModal, setShowRebookModal] = useState(false)
  const shouldAutoOpenRebook = searchParams.get('rebook') === '1'

  useEffect(() => {
    if (shouldAutoOpenRebook) {
      setShowRebookModal(true)
    }
  }, [shouldAutoOpenRebook])

  const checkoutSessionIdFromUrl = searchParams.get('checkout_session_id')

  useEffect(() => {
    const run = async () => {
      if (!checkoutSessionIdFromUrl) return
      if (!booking) return
      if (booking.paid) return

      try {
        const res = await confirmCheckoutPayment({
          variables: { bookingId: booking.id, checkoutSessionId: checkoutSessionIdFromUrl },
        })
        const payload = res.data?.confirmBookingCheckoutPayment
        const errors = payload?.errors || []
        if (errors.length) throw new Error(errors.join(', '))

        addToast({ message: 'Payment confirmed', type: 'success' })
        navigate(`/bookings/${booking.id}`, { replace: true })
      } catch (e) {
        addToast({ message: e.message || 'Could not confirm payment', type: 'error' })
      }
    }

    run()
  }, [addToast, booking, checkoutSessionIdFromUrl, confirmCheckoutPayment, navigate])

  const handleCancel = async () => {
    if (!booking) return
    if (!window.confirm('Cancel this booking?')) return
    try {
      const res = await cancelBooking({ variables: { id: booking.id } })
      const payload = res.data?.cancelBooking
      if (!payload?.success) {
        throw new Error((payload?.errors || ['Could not cancel booking']).join(', '))
      }
      addToast({ message: 'Booking cancelled', type: 'success' })
      navigate('/bookings')
    } catch (e) {
      addToast({ message: e.message || 'Failed to cancel booking', type: 'error' })
    }
  }

  const handleArchive = async () => {
    if (!booking) return
    try {
      const res = await archiveBooking({ variables: { id: booking.id } })
      const payload = res.data?.archiveBooking
      if (!payload?.success) {
        throw new Error((payload?.errors || ['Could not archive booking']).join(', '))
      }
      addToast({ message: 'Booking archived', type: 'success' })
      navigate('/bookings')
    } catch (e) {
      addToast({ message: e.message || 'Failed to archive booking', type: 'error' })
    }
  }

  const loadingBooking = !user || (isClient ? myBookingsLoading : bookingsLoading)

  if (loadingBooking && !booking) {
    return <div className="text-sm text-slate-400">Loading booking…</div>
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-xl space-y-3 text-sm text-slate-200">
        <p>Booking not found.</p>
        <button
          type="button"
          onClick={() => navigate('/bookings')}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          Back to bookings
        </button>
      </div>
    )
  }

  const session = booking.classSession
  const template = session.classTemplate
  const priceDollars = booking.priceCents != null
    ? (booking.priceCents / 100).toFixed(2)
    : template?.priceCents
      ? (template.priceCents / 100).toFixed(2)
      : null
  const payment = booking.payment
  const paymentAmount = payment ? (payment.amountCents / 100).toFixed(2) : priceDollars
  const currency = (template?.currency || 'cad').toLowerCase()
  const currencyLabel = currency.toUpperCase()
  const currencySymbol = currency === 'usd' ? '$' : 'CA$'

  const stripePublishableKey = paymentPublicSettingsData?.paymentPublicSettings?.stripePublishableKey
  const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

  const myClient = myClientData?.myClient
  const savedMethods = myClient?.clientPaymentMethods || []
  const defaultSavedMethodId =
    savedMethods.find((m) => m.default)?.stripePaymentMethodId || myClient?.stripeDefaultPaymentMethodId || null

  const canUseSavedCard = !!(
    savedMethods.length > 0 &&
    booking?.client?.id &&
    myClient?.id &&
    booking.client.id === myClient.id
  )

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Booking details</h1>
          <p className="text-sm text-slate-400">Review the booking and payment information.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/bookings')}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          Back
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
        <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">Class</h2>
              <p className="text-xs text-slate-400">{template?.title || 'Class'}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-slate-300">
              {booking.status}
            </span>
          </div>
          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Date & time</span>
              <span>{new Date(session.startTime).toLocaleString()}</span>
            </div>
            {session.room && (
              <div className="flex justify-between">
                <span>Room</span>
                <span>{session.room}</span>
              </div>
            )}
            {session.instructor && (
              <div className="flex justify-between">
                <span>Instructor</span>
                <span>{session.instructor.name}</span>
              </div>
            )}
          </div>

          <div className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-300">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Client</h3>
            <div className="mt-1 space-y-0.5">
              <div>{booking.client.name}</div>
              {booking.client.email && (
                <div className="text-slate-400">{booking.client.email}</div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm">
          <h2 className="text-sm font-semibold text-slate-50">Receipt</h2>
          <div className="mt-2 space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Class</span>
              <span>{template?.title || 'Class'}</span>
            </div>
            {!payment && (
              <div className="flex justify-between">
                <span>Payment status</span>
                <span className="font-medium text-amber-200">Unpaid</span>
              </div>
            )}
            {payment && (
              <>
                <div className="flex justify-between">
                  <span>Payment status</span>
                  <span className="font-medium">
                    {payment.status === 'succeeded' ? 'Paid' : payment.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Payment date</span>
                  <span>{new Date(payment.createdAt).toLocaleString()}</span>
                </div>
                {payment.errorMessage && (
                  <div className="mt-1 text-[11px] text-rose-300">
                    Error: {payment.errorMessage}
                  </div>
                )}
              </>
            )}
            {paymentAmount && (
              <>
                <div className="mt-2 h-px bg-slate-800" />
                <div className="flex justify-between text-sm font-semibold text-slate-50">
                  <span>Total</span>
                  <span>
                    ${paymentAmount}{' '}
                    {payment?.currency ? payment.currency.toUpperCase() : ''}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-2 text-xs">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center rounded-full border border-slate-600 px-3 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              Print receipt
            </button>

            {isClient && !booking.paid && booking.status !== 'cancelled' && (
              <button
                type="button"
                disabled={creatingCheckout}
                onClick={async () => {
                  try {
                    const res = await createCheckoutSession({ variables: { bookingId: booking.id } })
                    const payload = res.data?.createBookingCheckoutSession
                    const errors = payload?.errors || []
                    if (errors.length) throw new Error(errors.join(', '))
                    if (!payload?.checkoutUrl) throw new Error('Checkout link is missing')
                    redirectToExternalUrl(payload.checkoutUrl)
                  } catch (e) {
                    addToast({ message: e.message || 'Could not start checkout', type: 'error' })
                  }
                }}
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-3 py-1 text-[11px] font-medium text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingCheckout ? 'Opening checkout…' : 'Pay now'}
              </button>
            )}

            {(isOwner || isStaff || isInstructor) && !booking.paid && booking.status !== 'cancelled' && (
              <button
                type="button"
                disabled={sendingReminder}
                onClick={async () => {
                  try {
                    const res = await sendPaymentReminder({ variables: { bookingId: booking.id } })
                    const payload = res.data?.sendBookingPaymentReminder
                    const errors = payload?.errors || []
                    if (errors.length) throw new Error(errors.join(', '))
                    addToast({ message: 'Payment reminder sent', type: 'success' })
                  } catch (e) {
                    addToast({ message: e.message || 'Could not send reminder', type: 'error' })
                  }
                }}
                className="inline-flex items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingReminder ? 'Sending…' : 'Send payment reminder'}
              </button>
            )}
            {(isOwner || isInstructor || isClient) && booking.status !== 'cancelled' && (
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center justify-center rounded-full bg-rose-600/80 px-3 py-1 text-[11px] font-medium text-rose-50 hover:bg-rose-500"
              >
                Cancel booking
              </button>
            )}
            {(isOwner || isInstructor || isClient) && booking.status === 'cancelled' && !booking.archived && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowRebookModal(true)}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-700/80 px-3 py-1 text-[11px] font-medium text-emerald-50 hover:bg-emerald-500"
                >
                  Re-book
                </button>
                {(isOwner || isInstructor) && (
                  <button
                    type="button"
                    onClick={handleArchive}
                    className="inline-flex items-center justify-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-700"
                  >
                    Archive booking
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {showRebookModal && stripePromise && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <Elements stripe={stripePromise}>
            <RebookCheckoutForm
              booking={booking}
              currencyLabel={currencyLabel}
              currencySymbol={currencySymbol}
              canUseSavedCard={canUseSavedCard}
              savedMethods={savedMethods}
              defaultSavedMethodId={defaultSavedMethodId}
              onClose={() => setShowRebookModal(false)}
              onSuccess={() => {
                setShowRebookModal(false)
                navigate('/bookings')
              }}
            />
          </Elements>
        </div>
      )}
    </div>
  )
}
