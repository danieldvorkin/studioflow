import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import { SESSION_BOOKINGS } from "../apollo/queries";
import {
  CANCEL_BOOKING,
  MARK_NO_SHOW_BOOKING,
  SEND_BOOKING_PAYMENT_REMINDER,
} from "../apollo/mutations";
import { useToast } from "../components/ToastProvider";
import { useAuth } from "../auth/AuthProvider";
import { isOwner, isStaff, isGodmode } from "../auth/permissions";

const STATUS_LABELS = {
  booked: "Booked",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
  no_show: "No-Show",
};

const STATUS_BADGE_CLASS = {
  booked:
    "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30",
  waitlisted:
    "bg-amber-500/10 text-amber-300 border border-amber-500/30",
  cancelled:
    "bg-slate-700/60 text-slate-400 border border-slate-600/30",
  no_show:
    "bg-rose-500/10 text-rose-300 border border-rose-500/30",
};

const ALL_STATUSES = ["booked", "waitlisted", "cancelled", "no_show"];

const EMPTY_BOOKINGS = [];

function formatCurrency(cents, currency) {
  if (!cents && cents !== 0) return "—";
  return `$${(cents / 100).toFixed(2)} ${(currency || "cad").toUpperCase()}`;
}

export default function SessionManage() {
  useDocumentTitle("Manage Session");
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const canManage =
    isGodmode(user) || isOwner(user) || isStaff(user);

  const [statusFilter, setStatusFilter] = useState("");

  const { data, loading, error, refetch } = useQuery(SESSION_BOOKINGS, {
    variables: { classSessionId: id },
    skip: !canManage,
    fetchPolicy: "cache-and-network",
  });

  const [cancelBooking, { loading: cancelling }] = useMutation(CANCEL_BOOKING);
  const [markNoShow, { loading: markingNoShow }] =
    useMutation(MARK_NO_SHOW_BOOKING);
  const [sendReminder, { loading: sendingReminder }] = useMutation(
    SEND_BOOKING_PAYMENT_REMINDER,
  );

  const allBookings = data?.bookings ?? EMPTY_BOOKINGS;

  const session = allBookings[0]?.classSession || null;
  const template = session?.classTemplate || null;
  const capacity = session?.capacity ?? null;

  const confirmedBookings = useMemo(
    () => allBookings.filter((b) => b.status === "booked"),
    [allBookings],
  );

  const stats = useMemo(() => {
    const confirmed = confirmedBookings.length;
    const paidRevenueCents = allBookings
      .filter((b) => b.paid && b.status !== "cancelled")
      .reduce((sum, b) => sum + (b.payment?.amountCents || b.priceCents || 0), 0);
    const unpaidBalanceCents = allBookings
      .filter((b) => !b.paid && b.status === "booked")
      .reduce(
        (sum, b) =>
          sum + (b.priceCents || template?.priceCents || 0),
        0,
      );
    const currency =
      template?.currency ||
      allBookings.find((b) => b.payment?.currency)?.payment?.currency ||
      "cad";
    return { confirmed, paidRevenueCents, unpaidBalanceCents, currency };
  }, [allBookings, confirmedBookings, template]);

  const filteredBookings = useMemo(() => {
    if (!statusFilter) return allBookings;
    return allBookings.filter((b) => b.status === statusFilter);
  }, [allBookings, statusFilter]);

  const handleCancel = async (bookingId) => {
    try {
      const res = await cancelBooking({ variables: { id: bookingId } });
      const payload = res.data?.cancelBooking;
      if (!payload?.success) {
        addToast({
          message: (payload?.errors || ["Could not cancel"]).join(", "),
          type: "error",
        });
      } else {
        addToast({ message: "Booking cancelled", type: "success" });
        refetch();
      }
    } catch (e) {
      addToast({ message: e.message || "Cancel failed", type: "error" });
    }
  };

  const handleMarkNoShow = async (bookingId) => {
    try {
      const res = await markNoShow({ variables: { id: bookingId } });
      const payload = res.data?.markNoShowBooking;
      if (!payload?.success) {
        addToast({
          message: (payload?.errors || ["Could not mark no-show"]).join(", "),
          type: "error",
        });
      } else {
        addToast({ message: "Marked as no-show", type: "success" });
        refetch();
      }
    } catch (e) {
      addToast({ message: e.message || "Action failed", type: "error" });
    }
  };

  const handleSendReminder = async (bookingId) => {
    try {
      const res = await sendReminder({ variables: { bookingId } });
      const payload = res.data?.sendBookingPaymentReminder;
      if (!payload?.success) {
        addToast({
          message: (payload?.errors || ["Could not send reminder"]).join(", "),
          type: "error",
        });
      } else {
        addToast({ message: "Payment reminder sent", type: "success" });
      }
    } catch (e) {
      addToast({ message: e.message || "Reminder failed", type: "error" });
    }
  };

  if (!canManage) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-rose-400">
          Access restricted to owners and staff.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-slate-400">Loading session…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-rose-400">Error loading session data.</p>
      </div>
    );
  }

  const actionsBusy = cancelling || markingNoShow || sendingReminder;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      {/* Header */}
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-slate-50">
              {template?.title || "Session"}
            </h1>
            {session && (
              <p className="mt-1 text-sm text-slate-400">
                {new Date(session.startTime).toLocaleString()}
                {session.room ? ` · Room: ${session.room}` : ""}
                {session.instructor?.name
                  ? ` · ${session.instructor.name}`
                  : ""}
              </p>
            )}
          </div>
          <Link
            to={`/templates/${template?.id}/sessions`}
            className="inline-flex items-center self-start rounded-full border border-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
          >
            ← Back to sessions
          </Link>
        </div>
      </header>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Confirmed / Capacity
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-50">
            {stats.confirmed}
            {capacity != null ? (
              <span className="text-base font-normal text-slate-400">
                {" "}
                / {capacity}
              </span>
            ) : null}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Revenue collected
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-400">
            {formatCurrency(stats.paidRevenueCents, stats.currency)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Outstanding balance
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-400">
            {formatCurrency(stats.unpaidBalanceCents, stats.currency)}
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            statusFilter === ""
              ? "bg-sky-500 text-white"
              : "border border-slate-700 text-slate-300 hover:bg-slate-800"
          }`}
        >
          All ({allBookings.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const count = allBookings.filter((b) => b.status === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? "bg-sky-500 text-white"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Roster */}
      {filteredBookings.length === 0 ? (
        <p className="text-sm text-slate-500">No bookings match this filter.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredBookings.map((booking) => {
            const canCancel =
              booking.status !== "cancelled" && booking.status !== "no_show";
            const canNoShow = booking.status === "booked";
            const canRemind = !booking.paid && booking.status === "booked";

            return (
              <li
                key={booking.id}
                className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {/* Client info */}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-50">
                        {booking.client.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE_CLASS[booking.status] || "bg-slate-700 text-slate-300"}`}
                      >
                        {STATUS_LABELS[booking.status] || booking.status}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          booking.paid
                            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                        }`}
                      >
                        {booking.paid ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                      <span>{booking.client.email}</span>
                      {booking.slug && (
                        <span className="font-mono">#{booking.slug}</span>
                      )}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
                    {canCancel && (
                      <button
                        type="button"
                        disabled={actionsBusy}
                        onClick={() => handleCancel(booking.id)}
                        className="rounded-full border border-rose-600/50 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-600/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                    {canNoShow && (
                      <button
                        type="button"
                        disabled={actionsBusy}
                        onClick={() => handleMarkNoShow(booking.id)}
                        className="rounded-full border border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        No-Show
                      </button>
                    )}
                    {canRemind && (
                      <button
                        type="button"
                        disabled={actionsBusy}
                        onClick={() => handleSendReminder(booking.id)}
                        className="rounded-full border border-amber-500/40 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Send reminder
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
