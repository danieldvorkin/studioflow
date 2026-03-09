import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  BOOKINGS,
  MY_BOOKINGS,
  MY_CLIENT,
  MY_PAYMENT_METHODS,
  PAYMENT_PUBLIC_SETTINGS,
} from "../../apollo/queries";
import {
  CANCEL_BOOKING,
  ARCHIVE_BOOKING,
  REBOOK_BOOKING_WITH_PAYMENT,
  CREATE_BOOKING_CHECKOUT_SESSION,
  CONFIRM_BOOKING_CHECKOUT_PAYMENT,
  SEND_BOOKING_PAYMENT_REMINDER,
} from "../../apollo/mutations";
import { useToast } from "../../components/shared/ToastProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { getStripeCardElementOptions } from "../../theme/stripeElements";
import { useAuth } from "../../auth/AuthProvider";
import { redirectToExternalUrl } from "../../payments/redirectToExternalUrl";

// ─── Calendar helpers ────────────────────────────────────────────────────────
function generateICS({
  title,
  startTime,
  endTime,
  location,
  description,
  uid,
}) {
  const fmt = (date) =>
    new Date(date)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StudioFlow//BookingShow//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:booking-${uid}@studioflow`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(startTime)}`,
    `DTEND:${fmt(endTime)}`,
    `SUMMARY:${title}`,
    ...(description
      ? [`DESCRIPTION:${description.replace(/\n/g, "\\n")}`]
      : []),
    ...(location ? [`LOCATION:${location}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function addToCalendar(booking, session, template) {
  const title = template?.title || "Class";
  const startTime = session.startTime;
  const endTime =
    session.endTime ||
    new Date(
      new Date(session.startTime).getTime() +
        (template?.durationMinutes || 60) * 60000,
    ).toISOString();
  const location = session.room ? `Room ${session.room}` : "";
  const description = [
    template?.description,
    session.instructor ? `Instructor: ${session.instructor.name}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const ics = generateICS({
    title,
    startTime,
    endTime,
    location,
    description,
    uid: booking.id,
  });
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "-")}-booking.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function timeUntilLabel(startTime) {
  const now = new Date();
  const start = new Date(startTime);
  const diffMs = start - now;
  if (diffMs <= 0) return null;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays <= 14) return "Next week";
  return null;
}

// ─── Info Tooltip ─────────────────────────────────────────────────────────────
function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-[10px] font-bold text-slate-400 hover:border-sky-500 hover:text-sky-400 focus:outline-none"
        aria-label="More info"
      >
        ?
      </button>
      {open && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-[11px] leading-relaxed text-slate-300 shadow-2xl">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
        </span>
      )}
    </span>
  );
}

// ─── Client Guidance Panel ────────────────────────────────────────────────────
function ClientGuidancePanel({ booking, isFree, session }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const isPast = session?.startTime
    ? new Date(session.startTime) < new Date()
    : false;
  const isUnpaid = !booking.paid && !isFree && booking.status !== "cancelled";

  let items = [];
  if (booking.status === "booked") {
    items = [
      {
        icon: "✓",
        label: "Your spot is confirmed",
        text: "You're all set for this class — we look forward to seeing you!",
        color: "text-emerald-400",
      },
      isUnpaid && {
        icon: "💳",
        label: "Payment pending",
        text: "Your spot is reserved but payment hasn't been completed. Tap Pay now below to secure it.",
        color: "text-amber-400",
      },
      !isPast && {
        icon: "📅",
        label: "Add to your calendar",
        text: "Download a .ics file so the class shows up in Apple Calendar, Google Calendar, or Outlook.",
        color: "text-sky-400",
      },
      !isPast && {
        icon: "✋",
        label: "Need to cancel?",
        text: "If your plans change, cancel below. Check with the studio for their cancellation policy.",
        color: "text-slate-400",
      },
      {
        icon: "🖨️",
        label: "Print receipt",
        text: "Save or print your booking confirmation for your records.",
        color: "text-slate-400",
      },
    ].filter(Boolean);
  } else if (booking.status === "waitlisted") {
    items = [
      {
        icon: "⏳",
        label: "You're queued up",
        text: "No spot is available right now — if one opens you'll be automatically confirmed.",
        color: "text-amber-400",
      },
      {
        icon: "📧",
        label: "Watch for a notification",
        text: "You'll receive an email when your status changes to confirmed.",
        color: "text-sky-400",
      },
      {
        icon: "✋",
        label: "Changed your mind?",
        text: "Remove yourself from the waitlist at any time by cancelling below.",
        color: "text-slate-400",
      },
    ];
  } else if (booking.status === "cancelled") {
    items = [
      {
        icon: "🔄",
        label: "Want to come back?",
        text: "Re-book below to sign up again — subject to availability and payment if required.",
        color: "text-emerald-400",
      },
      {
        icon: "📚",
        label: "Browse other classes",
        text: "Head to the schedule to find other upcoming sessions.",
        color: "text-sky-400",
      },
    ];
  }

  if (!items.length) return null;

  return (
    <div className="relative rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss tips"
        className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-slate-500 hover:bg-slate-800 hover:text-slate-300"
      >
        ×
      </button>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-sky-400/80">
        What you can do
      </p>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className={`mt-0.5 shrink-0 text-sm ${item.color}`}>
              {item.icon}
            </span>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-200">
                {item.label} —{" "}
              </span>
              <span className="text-xs text-slate-400">{item.text}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────
function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  confirmClassName,
  onConfirm,
  onCancel,
  danger = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-50">{title}</h3>
        {message && <p className="mt-1.5 text-sm text-slate-400">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-600 px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Keep booking
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              confirmClassName ||
              (danger
                ? "rounded-full bg-rose-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-500"
                : "rounded-full bg-sky-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-400")
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const stripe = useStripe();
  const elements = useElements();
  const [rebookWithPayment] = useMutation(REBOOK_BOOKING_WITH_PAYMENT);
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState("new");
  const [selectedSavedPaymentMethodId, setSelectedSavedPaymentMethodId] =
    useState("");

  const { theme } = useTheme();
  const cardElementOptions = useMemo(
    () => getStripeCardElementOptions(theme),
    [theme],
  );

  useEffect(() => {
    if (!selectedSavedPaymentMethodId && defaultSavedMethodId) {
      setSelectedSavedPaymentMethodId(defaultSavedMethodId);
    }
  }, [defaultSavedMethodId, selectedSavedPaymentMethodId]);

  const canUseSaved = !!(canUseSavedCard && savedMethods?.length);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (submitting) return;
      setSubmitting(true);

      let paymentMethodIdToUse = null;
      if (paymentChoice === "saved") {
        if (!canUseSaved)
          throw new Error("Saved card is not available for this booking");
        if (!selectedSavedPaymentMethodId)
          throw new Error("Please choose a saved card");

        const isKnown = (savedMethods || []).some(
          (m) => m.stripePaymentMethodId === selectedSavedPaymentMethodId,
        );
        if (!isKnown) throw new Error("Selected saved card is not available");

        paymentMethodIdToUse = selectedSavedPaymentMethodId;
      } else {
        if (!stripe || !elements) {
          throw new Error("Payment form is not ready yet");
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error("Payment details are missing");
        }

        const { paymentMethod, error: pmError } =
          await stripe.createPaymentMethod({
            type: "card",
            card: cardElement,
          });

        if (pmError || !paymentMethod) {
          throw new Error(
            pmError?.message || "Payment method could not be created",
          );
        }

        paymentMethodIdToUse = paymentMethod.id;
      }

      const res = await rebookWithPayment({
        variables: {
          id: booking.id,
          paymentMethodId: paymentMethodIdToUse,
        },
      });

      const payload = res.data?.rebookBookingWithPayment;
      const errors = payload?.errors || [];
      if (errors.length || !payload?.booking) {
        throw new Error(errors.join(", ") || "Rebooking failed");
      }

      addToast({
        message: "Booking re-booked and payment confirmed",
        type: "success",
      });
      onSuccess();
    } catch (err) {
      addToast({ message: err.message || "Rebooking failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const amountCents = booking.priceCents;
  const amount = amountCents ? (amountCents / 100).toFixed(2) : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm shadow-xl shadow-black/60"
    >
      <h3 className="text-sm font-semibold text-slate-50">
        Confirm payment to re-book
      </h3>
      {amount && (
        <p className="text-xs text-slate-300">
          You will be charged {currencySymbol}
          {amount} {currencyLabel} to re-book this class.
        </p>
      )}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-300">
          Payment
        </label>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-300">
          <div className="font-semibold text-slate-200">Secure payment</div>
          <div className="mt-0.5 text-slate-400">
            Card details are sent directly to Stripe for processing. We don’t
            store your full card number.
          </div>
        </div>

        {canUseSaved && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-200">
            <div className="flex flex-col gap-1">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  className="h-3 w-3"
                  checked={paymentChoice === "saved"}
                  onChange={() => setPaymentChoice("saved")}
                />
                <span>Use a saved card</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  className="h-3 w-3"
                  checked={paymentChoice === "new"}
                  onChange={() => setPaymentChoice("new")}
                />
                <span>Use a different card</span>
              </label>

              {paymentChoice === "saved" && (
                <div className="mt-2 space-y-1">
                  <label className="block text-[11px] font-medium text-slate-400">
                    Saved card
                  </label>
                  <select
                    value={selectedSavedPaymentMethodId}
                    onChange={(e) =>
                      setSelectedSavedPaymentMethodId(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  >
                    {(savedMethods || []).map((m) => (
                      <option key={m.id} value={m.stripePaymentMethodId}>
                        {(m.brand || "card").toString().toUpperCase()} ••••{" "}
                        {m.last4 || "••••"}
                        {m.expMonth && m.expYear
                          ? ` (exp ${String(m.expMonth).padStart(2, "0")}/${String(m.expYear).slice(-2)})`
                          : ""}
                        {m.default ? " — default" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {(!canUseSaved || paymentChoice === "new") && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
            <CardElement key={`card-${theme}`} options={cardElementOptions} />
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
          {submitting ? "Processing…" : "Confirm & pay"}
        </button>
      </div>
    </form>
  );
}

// Simple confirm button for free re-books when Stripe is not available
function FreeRebookButton({ bookingId, onClose, onSuccess }) {
  const [rebookWithPayment] = useMutation(REBOOK_BOOKING_WITH_PAYMENT);
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handle = async () => {
    try {
      setSubmitting(true);
      const res = await rebookWithPayment({ variables: { id: bookingId } });
      const payload = res.data?.rebookBookingWithPayment;
      const errors = payload?.errors || [];
      if (errors.length || !payload?.booking) {
        throw new Error(errors.join(", ") || "Rebooking failed");
      }
      addToast({ message: "Booking confirmed", type: "success" });
      onSuccess();
    } catch (err) {
      addToast({ message: err.message || "Rebooking failed", type: "error" });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      disabled={submitting}
      onClick={handle}
      className="rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {submitting ? "Confirming…" : "Confirm re-book"}
    </button>
  );
}

export default function BookingShow() {
  useDocumentTitle("Booking Details");
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const role = (user?.roleName || "").toString().toLowerCase();
  const isGodmode = user?.godmode === true || role === "godmode";
  const isClient = role === "client";
  const isInstructor = isGodmode || role === "instructor";
  const isOwner = isGodmode || role === "owner" || user?.role === 0;
  const isStaff = isGodmode || role === "staff" || user?.role === 1;

  const { data: bookingsData, loading: bookingsLoading } = useQuery(BOOKINGS, {
    skip: !user || isClient,
    variables: {},
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const { data: myBookingsData, loading: myBookingsLoading } = useQuery(
    MY_BOOKINGS,
    {
      skip: !user || !isClient,
      variables: {},
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
    },
  );

  const bookingList = isClient
    ? myBookingsData?.myBookings || []
    : bookingsData?.bookings || [];
  const booking = bookingList.find((b) => b.id === id);
  const bookingStudioId = booking?.studioId || null;

  const { data: paymentPublicSettingsData } = useQuery(
    PAYMENT_PUBLIC_SETTINGS,
    {
      skip: !bookingStudioId,
      variables: { studioId: bookingStudioId },
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
    },
  );

  const { data: myClientData } = useQuery(MY_CLIENT, {
    skip: !isClient || !bookingStudioId,
    variables: { studioId: bookingStudioId },
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const { data: myPaymentMethodsData } = useQuery(MY_PAYMENT_METHODS, {
    skip: !isClient,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });
  const [cancelBooking] = useMutation(CANCEL_BOOKING);
  const [archiveBooking] = useMutation(ARCHIVE_BOOKING);
  const [createCheckoutSession, { loading: creatingCheckout }] = useMutation(
    CREATE_BOOKING_CHECKOUT_SESSION,
  );
  const [confirmCheckoutPayment] = useMutation(
    CONFIRM_BOOKING_CHECKOUT_PAYMENT,
  );
  const [sendPaymentReminder, { loading: sendingReminder }] = useMutation(
    SEND_BOOKING_PAYMENT_REMINDER,
  );
  const { addToast } = useToast();

  const [showRebookModal, setShowRebookModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const checkoutConfirmedRef = useRef(false);
  const shouldAutoOpenRebook = searchParams.get("rebook") === "1";

  useEffect(() => {
    if (shouldAutoOpenRebook) {
      setShowRebookModal(true);
    }
  }, [shouldAutoOpenRebook]);

  const checkoutSessionIdFromUrl = searchParams.get("checkout_session_id");

  useEffect(() => {
    const run = async () => {
      if (!checkoutSessionIdFromUrl) return;
      if (!booking) return;
      if (booking.paid) return;
      if (checkoutConfirmedRef.current) return;
      checkoutConfirmedRef.current = true;

      try {
        const res = await confirmCheckoutPayment({
          variables: {
            bookingId: booking.id,
            checkoutSessionId: checkoutSessionIdFromUrl,
          },
        });
        const payload = res.data?.confirmBookingCheckoutPayment;
        const errors = payload?.errors || [];
        if (errors.length) throw new Error(errors.join(", "));

        addToast({ message: "Payment confirmed", type: "success" });
        navigate(`/bookings/${booking.id}`, { replace: true });
      } catch (e) {
        addToast({
          message: e.message || "Could not confirm payment",
          type: "error",
        });
      }
    };

    run();
  }, [
    addToast,
    booking,
    checkoutSessionIdFromUrl,
    confirmCheckoutPayment,
    navigate,
  ]);

  const handleCancel = async () => {
    if (!booking) return;
    try {
      const res = await cancelBooking({ variables: { id: booking.id } });
      const payload = res.data?.cancelBooking;
      if (!payload?.success) {
        throw new Error(
          (payload?.errors || ["Could not cancel booking"]).join(", "),
        );
      }
      const feeCents = payload.cancellationFeeCents;
      if (feeCents > 0) {
        const sym =
          (
            booking.classSession?.classTemplate?.currency || "cad"
          ).toLowerCase() === "usd"
            ? "$"
            : "CA$";
        const feeDollars = (feeCents / 100).toFixed(2);
        const refundDollars = ((payload.refundCents || 0) / 100).toFixed(2);
        addToast({
          message: `Booking cancelled. A late-cancellation fee of ${sym}${feeDollars} was applied. Refund of ${sym}${refundDollars} will appear within 5–10 business days.`,
          type: "warning",
        });
      } else {
        addToast({ message: "Booking cancelled", type: "success" });
      }
      navigate("/bookings");
    } catch (e) {
      addToast({
        message: e.message || "Failed to cancel booking",
        type: "error",
      });
    }
  };

  const handleArchive = async () => {
    if (!booking) return;
    try {
      const res = await archiveBooking({ variables: { id: booking.id } });
      const payload = res.data?.archiveBooking;
      if (!payload?.success) {
        throw new Error(
          (payload?.errors || ["Could not archive booking"]).join(", "),
        );
      }
      addToast({ message: "Booking archived", type: "success" });
      navigate("/bookings");
    } catch (e) {
      addToast({
        message: e.message || "Failed to archive booking",
        type: "error",
      });
    }
  };

  const handlePay = useCallback(async () => {
    try {
      const res = await createCheckoutSession({
        variables: { bookingId: booking?.id },
      });
      const payload = res.data?.createBookingCheckoutSession;
      const errors = payload?.errors || [];
      if (errors.length) throw new Error(errors.join(", "));
      if (!payload?.checkoutUrl) throw new Error("Checkout link is missing");
      redirectToExternalUrl(payload.checkoutUrl);
    } catch (e) {
      addToast({
        message: e.message || "Could not start checkout",
        type: "error",
      });
    }
  }, [addToast, booking?.id, createCheckoutSession]);

  const stripePublishableKey =
    paymentPublicSettingsData?.paymentPublicSettings?.stripePublishableKey;
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );

  // Late-cancellation policy derived from studio settings
  const lateCancelWindowMinutes =
    paymentPublicSettingsData?.paymentPublicSettings?.lateCancelWindowMinutes ??
    30;
  const lateCancelFeePercent =
    paymentPublicSettingsData?.paymentPublicSettings?.lateCancelFeePercent ??
    30;

  const loadingBooking =
    !user || (isClient ? myBookingsLoading : bookingsLoading);

  if (loadingBooking && !booking) {
    return <div className="text-sm text-slate-400">Loading booking…</div>;
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-xl space-y-3 text-sm text-slate-200">
        <p>Booking not found.</p>
        <button
          type="button"
          onClick={() => navigate("/bookings")}
          className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          Back to bookings
        </button>
      </div>
    );
  }

  const session = booking.classSession;
  const template = session.classTemplate;
  const effectivePriceCents =
    booking.priceCents != null
      ? booking.priceCents
      : (template?.priceCents ?? null);
  const isFree = effectivePriceCents === 0;
  const priceDollars =
    effectivePriceCents != null ? (effectivePriceCents / 100).toFixed(2) : null;
  const payment = booking.payment;
  const bundlePurchase = booking.bundlePurchase;
  const usedBundleCredit = !!bundlePurchase;
  const paymentAmount = payment
    ? (payment.amountCents / 100).toFixed(2)
    : priceDollars;
  const currency = (template?.currency || "cad").toLowerCase();
  const currencyLabel = currency.toUpperCase();
  const currencySymbol = currency === "usd" ? "$" : "CA$";

  // Duration: prefer session endTime diff, fall back to template.durationMinutes
  let durationMinutes = template?.durationMinutes ?? null;
  if (!durationMinutes && session.endTime) {
    const diff =
      (new Date(session.endTime) - new Date(session.startTime)) / 60000;
    if (diff > 0) durationMinutes = Math.round(diff);
  }
  const capacity = session.capacity ?? null;

  const myClient = myClientData?.myClient;
  const savedMethods = myPaymentMethodsData?.myPaymentMethods || [];
  const defaultSavedMethodId =
    savedMethods.find((m) => m.default)?.stripePaymentMethodId ||
    myClient?.stripeDefaultPaymentMethodId ||
    null;

  // Saved cards belong to the logged-in user; only allow when booking is for this client
  const canUseSavedCard = !!(
    savedMethods.length > 0 &&
    myClient?.id &&
    booking?.client?.id &&
    booking.client.id === myClient.id
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* ── Page header ────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">
            Booking details
          </h1>
          <p className="text-xs text-slate-400">
            Booked on{" "}
            {new Date(booking.createdAt).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}
            {booking.slug ? ` · #${booking.slug}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/bookings")}
          className="shrink-0 rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          ← Back
        </button>
      </header>

      {/* ── Class hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-400">
              Class
            </p>
            <h2 className="mt-0.5 truncate text-2xl font-bold text-slate-50">
              {template?.title || "Class"}
            </h2>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${
              booking.status === "booked"
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                : booking.status === "waitlisted"
                  ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
                  : booking.status === "cancelled"
                    ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30"
                    : "bg-slate-700 text-slate-300"
            }`}
          >
            {booking.status}
          </span>
        </div>

        {template?.description && (
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            {template.description}
          </p>
        )}

        {(durationMinutes || capacity || isFree) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {durationMinutes && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 shrink-0 text-sky-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {durationMinutes} min
              </span>
            )}
            {capacity && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 shrink-0 text-sky-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {capacity} spots
              </span>
            )}
            {isFree && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
                Free class
              </span>
            )}
          </div>
        )}

        {booking.status === "waitlisted" && (
          <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
            <p className="text-sm font-semibold text-amber-200">
              You&rsquo;re on the waitlist
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-amber-300/80">
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                <span>
                  If a spot opens up, you&rsquo;ll be{" "}
                  <span className="font-medium text-amber-200">
                    automatically confirmed
                  </span>{" "}
                  — no action needed.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                <span>
                  You&rsquo;ll receive an email notification when your status
                  changes.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                <span>
                  Changed your mind? Cancel your waitlist spot below at any
                  time.
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* ── Client guidance panel ──────────────────────────────────── */}
      {isClient && (
        <ClientGuidancePanel
          booking={booking}
          isFree={isFree}
          session={session}
        />
      )}

      {/* ── Main grid ──────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Schedule */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-sky-400/80">
              Schedule
            </h3>
            <div className="flex items-start gap-4">
              {/* Calendar icon block */}
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-400">
                  {new Date(session.startTime).toLocaleDateString(undefined, {
                    month: "short",
                  })}
                </span>
                <span className="text-2xl font-bold leading-tight text-slate-50">
                  {new Date(session.startTime).getDate()}
                </span>
              </div>
              <div className="space-y-0.5 text-sm text-slate-200">
                <p className="font-semibold text-slate-50">
                  {new Date(session.startTime).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-slate-400">
                  {new Date(session.startTime).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {session.room && (
                  <p className="text-slate-400">
                    Room&nbsp;
                    <span className="font-medium text-slate-200">
                      {session.room}
                    </span>
                  </p>
                )}
                {session.seatsAvailable != null && capacity != null && (
                  <p className="text-slate-400">
                    <span
                      className={`font-medium ${
                        session.seatsAvailable <= 2
                          ? "text-amber-300"
                          : "text-slate-200"
                      }`}
                    >
                      {session.seatsAvailable}
                    </span>{" "}
                    / {capacity} seats available
                  </p>
                )}
                {timeUntilLabel(session.startTime) && (
                  <span className="mt-1 inline-block rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                    {timeUntilLabel(session.startTime)}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Instructor */}
          {session.instructor && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-sky-400/80">
                Instructor
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-base font-bold text-sky-300">
                  {session.instructor.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-semibold text-slate-50">
                    {session.instructor.name}
                  </p>
                  <p className="text-xs text-slate-400">Instructor</p>
                </div>
              </div>
            </section>
          )}

          {/* Client (staff/owner view) */}
          {!isClient && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-sky-400/80">
                Client
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-base font-bold text-slate-300">
                  {booking.client.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-semibold text-slate-50">
                    {booking.client.name}
                  </p>
                  {booking.client.email && (
                    <p className="text-xs text-slate-400">
                      {booking.client.email}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right column — Payment + Actions */}
        <div className="space-y-4">
          {/* Payment */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-sky-400/80">
                Payment
              </h3>
              <InfoTooltip text="Shows how this class was paid for. 'Paid via bundle' means a credit from a bundle package was used. 'Unpaid' means payment is still needed to fully secure your booking." />
            </div>

            {/* Status pill */}
            <div className="mb-1 flex items-center gap-2">
              {usedBundleCredit ? (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/25">
                  Paid via bundle
                </span>
              ) : booking.paid || payment?.status === "succeeded" ? (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/25">
                  Paid
                </span>
              ) : isFree ? (
                <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/25">
                  Free
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/25">
                  Unpaid
                </span>
              )}
            </div>

            {isClient &&
              !booking.paid &&
              !isFree &&
              booking.status !== "cancelled" && (
                <p className="mb-3 mt-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-[11px] leading-relaxed text-amber-300/90">
                  Your spot is reserved but payment hasn&rsquo;t been completed.
                  Use the{" "}
                  <span className="font-semibold text-amber-200">Pay now</span>{" "}
                  button in Actions to secure your booking.
                </p>
              )}

            <div className="space-y-2 text-xs text-slate-400">
              {usedBundleCredit ? (
                <>
                  <div className="flex justify-between">
                    <span>Source</span>
                    <span className="font-medium text-slate-200">
                      Bundle credit
                    </span>
                  </div>
                  {bundlePurchase?.bundleProduct?.title && (
                    <div className="flex justify-between">
                      <span>Bundle</span>
                      <span className="text-slate-200">
                        {bundlePurchase.bundleProduct.title}
                      </span>
                    </div>
                  )}
                  {Number.isFinite(bundlePurchase?.creditsRemaining) &&
                    Number.isFinite(bundlePurchase?.creditsTotal) && (
                      <div className="flex justify-between">
                        <span>Credits left</span>
                        <span className="text-slate-200">
                          {bundlePurchase.creditsRemaining} /{" "}
                          {bundlePurchase.creditsTotal}
                        </span>
                      </div>
                    )}
                  <div className="mt-1 h-px bg-slate-800" />
                  <div className="flex justify-between text-sm font-semibold text-slate-50">
                    <span>Total</span>
                    <span>1 credit</span>
                  </div>
                </>
              ) : (
                <>
                  {payment && (
                    <>
                      <div className="flex justify-between">
                        <span>Date paid</span>
                        <span className="text-slate-200">
                          {new Date(payment.createdAt).toLocaleDateString(
                            undefined,
                            { dateStyle: "medium" },
                          )}
                        </span>
                      </div>
                      {payment.errorMessage && (
                        <p className="text-[11px] text-rose-300">
                          Error: {payment.errorMessage}
                        </p>
                      )}
                    </>
                  )}
                  {paymentAmount && !isFree && (
                    <>
                      <div className="mt-1 h-px bg-slate-800" />
                      <div className="flex justify-between text-sm font-semibold text-slate-50">
                        <span>Total</span>
                        <span>
                          {currencySymbol}
                          {paymentAmount} {currencyLabel}
                        </span>
                      </div>
                    </>
                  )}
                  {isFree && (
                    <>
                      <div className="mt-1 h-px bg-slate-800" />
                      <div className="flex justify-between text-sm font-semibold text-slate-50">
                        <span>Total</span>
                        <span className="text-sky-300">Free</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Actions */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-sky-400/80">
                Actions
              </h3>
              <InfoTooltip text="These are actions you can take on this booking. Hover over any button description to learn more before acting." />
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                >
                  Print receipt
                </button>
                <p className="mt-1 px-1 text-[10px] leading-relaxed text-slate-500">
                  Save or print a copy of your booking confirmation for your
                  records.
                </p>
              </div>

              {booking.status !== "cancelled" && (
                <div>
                  <button
                    type="button"
                    onClick={() => addToCalendar(booking, session, template)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 shrink-0 text-sky-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Add to Calendar
                  </button>
                  <p className="mt-1 px-1 text-[10px] leading-relaxed text-slate-500">
                    Downloads a .ics file compatible with Apple Calendar, Google
                    Calendar, and Outlook.
                  </p>
                </div>
              )}

              {isClient &&
                !booking.paid &&
                !isFree &&
                booking.status !== "cancelled" && (
                  <div>
                    <button
                      type="button"
                      disabled={creatingCheckout}
                      onClick={handlePay}
                      className="inline-flex items-center justify-center rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingCheckout ? "Opening checkout…" : "Pay now"}
                    </button>
                    <p className="mt-1 px-1 text-[10px] leading-relaxed text-slate-500">
                      Securely complete payment via Stripe. Your booking is
                      fully confirmed once payment succeeds.
                    </p>
                  </div>
                )}

              {(isOwner || isStaff || isInstructor) &&
                !booking.paid &&
                !isFree &&
                booking.status !== "cancelled" && (
                  <div>
                    <button
                      type="button"
                      disabled={sendingReminder}
                      onClick={async () => {
                        try {
                          const res = await sendPaymentReminder({
                            variables: { bookingId: booking.id },
                          });
                          const payload = res.data?.sendBookingPaymentReminder;
                          const errors = payload?.errors || [];
                          if (errors.length) throw new Error(errors.join(", "));
                          addToast({
                            message: "Payment reminder sent",
                            type: "success",
                          });
                        } catch (e) {
                          addToast({
                            message: e.message || "Could not send reminder",
                            type: "error",
                          });
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingReminder ? "Sending…" : "Send payment reminder"}
                    </button>
                  </div>
                )}

              {(isOwner || isInstructor || isClient) &&
                booking.status !== "cancelled" && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="inline-flex items-center justify-center rounded-full bg-rose-600/80 px-3 py-1.5 text-xs font-semibold text-rose-50 hover:bg-rose-500"
                    >
                      Cancel booking
                    </button>
                    {isClient && (
                      <p className="mt-1 px-1 text-[10px] leading-relaxed text-slate-500">
                        This releases your spot. Cancellations may be subject to
                        the studio&rsquo;s policy — check before proceeding.
                      </p>
                    )}
                  </div>
                )}

              {(isOwner || isInstructor || isClient) &&
                booking.status === "cancelled" &&
                !booking.archived && (
                  <>
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowRebookModal(true)}
                        className="inline-flex items-center justify-center rounded-full bg-emerald-700/80 px-3 py-1.5 text-xs font-semibold text-emerald-50 hover:bg-emerald-500"
                      >
                        Re-book
                      </button>
                      <p className="mt-1 px-1 text-[10px] leading-relaxed text-slate-500">
                        Sign up for this class again — subject to availability.
                        Payment may be required to confirm the new booking.
                      </p>
                    </div>
                    {(isOwner || isInstructor) && (
                      <div>
                        <button
                          type="button"
                          onClick={handleArchive}
                          className="inline-flex items-center justify-center rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700"
                        >
                          Archive booking
                        </button>
                      </div>
                    )}
                  </>
                )}
            </div>
          </section>
        </div>
      </div>

      {/* ── Cancel confirmation modal ───────────────────────────────── */}
      {showCancelModal &&
        (() => {
          const session = booking?.classSession;
          const minutesUntilClass = session?.startTime
            ? (new Date(session.startTime) - Date.now()) / 60000
            : Infinity;
          const isLateCancel =
            minutesUntilClass >= 0 &&
            minutesUntilClass < lateCancelWindowMinutes;
          const paidCents = booking?.priceCents || 0;
          const feeCents = isLateCancel
            ? Math.round((paidCents * lateCancelFeePercent) / 100)
            : 0;
          const refundCents = paidCents - feeCents;
          const sym = currencySymbol;

          const feeWarning =
            isLateCancel && booking?.paid && paidCents > 0
              ? `This class starts in less than ${lateCancelWindowMinutes} min — a ${lateCancelFeePercent}% late-cancellation fee (${sym}${(feeCents / 100).toFixed(2)}) applies. You will receive a refund of ${sym}${(refundCents / 100).toFixed(2)}.`
              : `This will cancel the booking for ${booking.client.name} in ${template?.title || "this class"} on ${new Date(session?.startTime).toLocaleDateString(undefined, { dateStyle: "medium" })}.`;

          return (
            <ConfirmModal
              title={
                isLateCancel && booking?.paid
                  ? "Late-cancellation fee applies"
                  : "Cancel this booking?"
              }
              message={feeWarning}
              confirmLabel="Yes, cancel booking"
              danger
              onCancel={() => setShowCancelModal(false)}
              onConfirm={async () => {
                setShowCancelModal(false);
                await handleCancel();
              }}
            />
          );
        })()}

      {/* ── Rebook modal ───────────────────────────────────────────── */}
      {showRebookModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
          {stripePromise ? (
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
                  setShowRebookModal(false);
                  navigate(`/bookings/${booking.id}`);
                }}
              />
            </Elements>
          ) : (
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
              <h3 className="text-base font-semibold text-slate-50">
                Re-book this class?
              </h3>
              {isFree ? (
                <p className="mt-1.5 text-sm text-slate-400">
                  This is a free class — no payment required. Confirm to reserve
                  your spot.
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-amber-400">
                  Payment is required to re-book, but the payment system
                  isn&rsquo;t configured yet. Please contact the studio to
                  complete your booking.
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRebookModal(false)}
                  className="rounded-full border border-slate-600 px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
                {isFree && (
                  <FreeRebookButton
                    bookingId={booking.id}
                    onClose={() => setShowRebookModal(false)}
                    onSuccess={() => {
                      setShowRebookModal(false);
                      navigate(`/bookings/${booking.id}`);
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
