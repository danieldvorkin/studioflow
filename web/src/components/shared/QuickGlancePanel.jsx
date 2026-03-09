import { useEffect, useRef } from "react";
import { useQuery } from "@apollo/client";
import { Link } from "react-router-dom";
import {
  BOOKINGS,
  CLIENTS,
  PAYMENTS,
  CLASS_SESSIONS,
} from "../../apollo/queries";

function formatCents(cents, currency) {
  const amount = Number(cents);
  if (!Number.isFinite(amount)) return "—";
  const cur = (currency || "cad").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(0)} ${cur}`;
  }
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isThisWeek(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  const day = startOfWeek.getDay(); // 0 Sun, 1 Mon …
  startOfWeek.setDate(startOfWeek.getDate() - ((day + 6) % 7)); // Monday
  return d >= startOfWeek && d <= now;
}

function isFuture(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) > new Date();
}

function StatusDot({ color }) {
  const colors = {
    green: "bg-emerald-400",
    yellow: "bg-amber-400",
    red: "bg-rose-400",
    blue: "bg-sky-400",
  };
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colors[color] || colors.blue}`}
    />
  );
}

function GlanceStat({ label, value, sub, to, color = "default" }) {
  const valueColor =
    color === "green"
      ? "text-emerald-400"
      : color === "amber"
        ? "text-amber-400"
        : "text-slate-50";
  const inner = (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 ${to ? "hover:border-sky-500/50 transition-colors" : ""}`}
    >
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className={`mt-0.5 text-xl font-bold ${valueColor}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
  if (to)
    return (
      <Link to={to} className="block">
        {inner}
      </Link>
    );
  return inner;
}

export default function QuickGlancePanel({ open, onClose }) {
  const panelRef = useRef(null);

  const { data: sessionsData, loading: sessionsLoading } = useQuery(
    CLASS_SESSIONS,
    {
      variables: {
        from: null,
        to: null,
        studioLocationId: null,
        studioId: null,
      },
      skip: !open,
      fetchPolicy: "cache-and-network",
    },
  );

  const { data: bookingsData, loading: bookingsLoading } = useQuery(BOOKINGS, {
    skip: !open,
    fetchPolicy: "cache-and-network",
  });

  const { data: clientsData, loading: clientsLoading } = useQuery(CLIENTS, {
    skip: !open,
    fetchPolicy: "cache-and-network",
  });

  const { data: paymentsData, loading: paymentsLoading } = useQuery(PAYMENTS, {
    skip: !open,
    fetchPolicy: "cache-and-network",
  });

  // Close on outside click/Escape
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sessions = sessionsData?.classSessions || [];
  const bookings = bookingsData?.bookings || [];
  const clients = clientsData?.clients || [];
  const payments = paymentsData?.payments || [];

  const loading =
    sessionsLoading || bookingsLoading || clientsLoading || paymentsLoading;

  // Derived stats
  const todaySessions = sessions.filter((s) => isToday(s.startTime));
  const futureSessions = sessions
    .filter((s) => isFuture(s.startTime))
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const nextSession = futureSessions[0] || null;

  const todayBookings = bookings.filter((b) => {
    const session = b.classSession;
    return (
      session &&
      isToday(session.startTime) &&
      b.status !== "cancelled" &&
      !b.archived
    );
  });
  const confirmedTodayBookings = todayBookings.filter(
    (b) => b.status === "confirmed" || b.paid,
  );

  const weekPayments = payments.filter(
    (p) => p.status === "succeeded" && isThisWeek(p.createdAt),
  );
  const weekRevenue = weekPayments.reduce(
    (sum, p) => sum + Number(p.amountCents || 0),
    0,
  );
  const weekCurrency = weekPayments[0]?.currency || "cad";

  const activeClients = clients.length;

  const weekBookings = bookings.filter((b) => {
    return (
      b.classSession &&
      isThisWeek(b.classSession.startTime) &&
      b.status !== "cancelled" &&
      !b.archived
    );
  });

  // Health indicator
  const healthColor =
    todaySessions.length === 0
      ? "yellow"
      : confirmedTodayBookings.length > 0
        ? "green"
        : "blue";

  function formatTime(dateStr) {
    if (!dateStr) return "—";
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(dateStr));
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(96vw,460px)] rounded-2xl border border-slate-700 bg-slate-950/98 shadow-2xl shadow-black/40 backdrop-blur-sm"
      role="dialog"
      aria-label="Quick glance"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusDot color={healthColor} />
          <span className="text-sm font-semibold text-sky-400 uppercase tracking-[0.2em]">
            Quick Glance
          </span>
          {loading && (
            <span className="text-[11px] text-slate-500 animate-pulse">
              Refreshing…
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Today row */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-400/60">
            Today
          </div>
          <div className="grid grid-cols-3 gap-2">
            <GlanceStat
              label="Sessions"
              value={loading ? "—" : todaySessions.length}
              sub={
                todaySessions.length === 1
                  ? "1 class"
                  : `${todaySessions.length} classes`
              }
              to="/schedule"
            />
            <GlanceStat
              label="Bookings"
              value={loading ? "—" : confirmedTodayBookings.length}
              sub={`of ${todayBookings.length} total`}
              to="/bookings"
              color={confirmedTodayBookings.length > 0 ? "green" : "default"}
            />
            <GlanceStat
              label="Clients"
              value={loading ? "—" : activeClients}
              to="/clients"
            />
          </div>
        </div>

        {/* This week row */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-400/60">
            This Week
          </div>
          <div className="grid grid-cols-2 gap-2">
            <GlanceStat
              label="Bookings"
              value={loading ? "—" : weekBookings.length}
              sub="confirmed this week"
              to="/bookings"
            />
            <GlanceStat
              label="Revenue"
              value={loading ? "—" : formatCents(weekRevenue, weekCurrency)}
              sub={`${weekPayments.length} payments`}
              color={weekRevenue > 0 ? "green" : "default"}
            />
          </div>
        </div>

        {/* Next upcoming class */}
        {(nextSession || loading) && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-400/60">
              Next Class
            </div>
            {loading && !nextSession ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-xs text-slate-500 animate-pulse">
                Loading…
              </div>
            ) : nextSession ? (
              <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate">
                      {nextSession.classTemplate?.title || "Class"}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatTime(nextSession.startTime)}
                    </div>
                    {nextSession.instructor && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        with {nextSession.instructor.name}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-slate-400">
                      {nextSession.seatsAvailable != null
                        ? `${nextSession.seatsAvailable} seats`
                        : ""}
                    </div>
                    {nextSession.room && (
                      <div className="text-xs text-slate-500">
                        {nextSession.room}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Footer links */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
          <Link
            to="/owner"
            onClick={onClose}
            className="font-semibold text-sky-400 hover:text-sky-300 transition-colors"
          >
            Owner workspace →
          </Link>
          <Link
            to="/analytics"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            Analytics
          </Link>
        </div>
      </div>
    </div>
  );
}
