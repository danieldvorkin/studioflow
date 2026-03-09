import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useQuery } from "@apollo/client";
import { useEffect, useMemo } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  BOOKINGS,
  CLASS_SESSIONS,
  CLASS_TEMPLATES,
  CURRENT_USER,
} from "../../apollo/queries";
import { useLocationContext } from "../../location/LocationProvider";

function parseDate(dateLike) {
  const d = new Date(dateLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfWeek(dateLike, weekStartsOn = 1) {
  const d = parseDate(dateLike);
  if (!d) return null;
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay(); // 0 Sun .. 6 Sat
  const diff = (day - weekStartsOn + 7) % 7;
  out.setDate(out.getDate() - diff);
  return out;
}

function futureWithinDays(dateLike, days, now = new Date()) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return false;
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  return d > now && d <= end;
}

function addDays(dateLike, days) {
  const d = parseDate(dateLike);
  if (!d) return null;
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function formatShortDate(dateLike) {
  const d = parseDate(dateLike);
  if (!d) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(d);
}

function pct(numerator, denominator) {
  const n = Number(numerator);
  const d = Number(denominator);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return null;
  return n / d;
}

function formatCents(cents, currency) {
  const amount = Number(cents);
  if (!Number.isFinite(amount)) return "—";
  const cur = (currency || "cad").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${cur}`;
  }
}

function StatRow({ label, value, helper }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-50">
          {label}
        </div>
        {helper && (
          <div className="mt-0.5 text-[11px] text-slate-400">{helper}</div>
        )}
      </div>
      <div className="shrink-0 text-sm font-semibold text-slate-100">
        {value}
      </div>
    </div>
  );
}

function Section({ id, title, subtitle, children }) {
  return (
    <section
      id={id}
      className="hash-target rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
          {title}
        </h2>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Analytics() {
  useDocumentTitle("Analytics");
  const { data: userData, loading: userLoading } = useQuery(CURRENT_USER);
  const { locationId } = useLocationContext();
  const location = useLocation();

  const roleName = (userData?.currentUser?.roleName || "")
    .toString()
    .toLowerCase();
  const roleInt = userData?.currentUser?.role;
  const isGodmode =
    roleName === "godmode" || userData?.currentUser?.godmode === true;
  const isOwner =
    isGodmode ||
    roleName === "owner" ||
    roleName === "owner_user" ||
    roleName === "owneruser" ||
    roleInt === 0;
  const isStaff = isGodmode || roleName === "staff" || roleInt === 1;
  const ownerLike = isOwner || isStaff;

  const now = useMemo(() => new Date(), []);

  const { data: templatesData, loading: templatesLoading } = useQuery(
    CLASS_TEMPLATES,
    {
      variables: { studioLocationId: locationId || null, studioId: null },
      skip: !ownerLike,
    },
  );
  const { data: sessionsData, loading: sessionsLoading } = useQuery(
    CLASS_SESSIONS,
    {
      variables: {
        from: null,
        to: null,
        studioLocationId: locationId || null,
        studioId: null,
      },
      skip: !ownerLike,
    },
  );
  const { data: bookingsData, loading: bookingsLoading } = useQuery(BOOKINGS, {
    variables: { studioLocationId: locationId || null, studioId: null },
    skip: !ownerLike,
  });

  const upcoming7 = useMemo(() => {
    const list = sessionsData?.classSessions || [];
    return [...list]
      .filter((s) => futureWithinDays(s?.startTime, 7, now))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 20);
  }, [now, sessionsData?.classSessions]);

  useEffect(() => {
    const hash = (location.hash || "").replace("#", "");
    if (!hash) return;

    let raf = requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ block: "start" });
    });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
  }, [location.hash]);

  if (userLoading) return <div>Loading…</div>;
  if (!userData?.currentUser) return <Navigate to="/signin" replace />;

  if (!ownerLike) return <Navigate to="/dashboard" replace />;

  const templates = templatesData?.classTemplates || [];
  const bookings = bookingsData?.bookings || [];

  const fromPaymentCurrency = bookings.find((b) => b?.payment?.currency)
    ?.payment?.currency;
  const fromTemplateCurrency = templates.find((t) => t?.currency)?.currency;
  const currency = (
    fromPaymentCurrency ||
    fromTemplateCurrency ||
    "cad"
  ).toUpperCase();

  const activeBookings = bookings.filter(
    (b) => b && b.status !== "cancelled" && !b.archived,
  );

  const ownerAnalytics = (() => {
    const active = activeBookings;
    const paid = active.filter((b) => b.paid);

    const grossFor = (booking) => {
      const cents = booking?.payment?.amountCents ?? booking?.priceCents ?? 0;
      return Number(cents) || 0;
    };

    const lastNDays = (days) => {
      const start = addDays(now, -days);
      if (!start) return [];
      return active.filter((b) => {
        const d = parseDate(b.createdAt);
        return d && d >= start;
      });
    };

    const last30 = lastNDays(30);
    const last90 = lastNDays(90);

    const paidLast30 = last30.filter((b) => b.paid);
    const paidLast90 = last90.filter((b) => b.paid);

    const funnel = (rows) => {
      const created = rows.length;
      const cancelled = rows.filter((b) => b.status === "cancelled").length;
      const paidCount = rows.filter((b) => b.paid).length;
      const unpaid = created - paidCount;
      return {
        created,
        cancelled,
        paidCount,
        unpaid,
        paidRate: pct(paidCount, created),
        cancelRate: pct(cancelled, created),
      };
    };

    const funnel30 = funnel(last30);
    const funnel7 = funnel(lastNDays(7));

    const weekBuckets = (() => {
      const weeks = [];
      const current = startOfWeek(now);
      if (!current) return weeks;
      const earliest = addDays(current, -7 * 11);
      if (!earliest) return weeks;

      const byKey = new Map();
      for (const b of paid) {
        const d = parseDate(b.createdAt);
        if (!d) continue;
        if (d < earliest) continue;
        const w = startOfWeek(d);
        if (!w) continue;
        const key = w.toISOString().slice(0, 10);
        const prev = byKey.get(key) || {
          weekStart: w,
          grossCents: 0,
          paidCount: 0,
        };
        byKey.set(key, {
          ...prev,
          grossCents: prev.grossCents + grossFor(b),
          paidCount: prev.paidCount + 1,
        });
      }

      for (let i = 11; i >= 0; i -= 1) {
        const w = addDays(current, -7 * i);
        if (!w) continue;
        const key = w.toISOString().slice(0, 10);
        const row = byKey.get(key) || {
          weekStart: w,
          grossCents: 0,
          paidCount: 0,
        };
        weeks.push(row);
      }
      return weeks;
    })();

    const highestWeek =
      [...weekBuckets]
        .filter((w) => w.grossCents > 0)
        .sort((a, b) => b.grossCents - a.grossCents)[0] || null;
    const lowestWeek =
      [...weekBuckets]
        .filter((w) => w.grossCents > 0)
        .sort((a, b) => a.grossCents - b.grossCents)[0] || null;

    const weekDelta = (() => {
      if (weekBuckets.length < 2) return null;
      const prev = weekBuckets[weekBuckets.length - 2];
      const cur = weekBuckets[weekBuckets.length - 1];
      if (!prev || !cur) return null;
      const changeCents = (cur.grossCents || 0) - (prev.grossCents || 0);
      const changePct = pct(changeCents, prev.grossCents || 0);
      return { changeCents, changePct };
    })();

    const topInstructorsLast30 = (() => {
      const map = new Map();
      for (const b of paidLast30) {
        const inst = b?.classSession?.instructor;
        if (!inst?.id) continue;
        const prev = map.get(inst.id) || {
          id: inst.id,
          name: inst.name || "Instructor",
          grossCents: 0,
          paidCount: 0,
          cancelledCount: 0,
          clients: new Set(),
        };
        const next = {
          ...prev,
          grossCents: prev.grossCents + grossFor(b),
          paidCount: prev.paidCount + 1,
        };
        const clientId = b?.client?.id;
        if (clientId) next.clients.add(clientId);
        map.set(inst.id, next);
      }
      for (const b of last30) {
        const inst = b?.classSession?.instructor;
        if (!inst?.id) continue;
        if (b.status !== "cancelled") continue;
        const prev = map.get(inst.id) || {
          id: inst.id,
          name: inst.name || "Instructor",
          grossCents: 0,
          paidCount: 0,
          cancelledCount: 0,
          clients: new Set(),
        };
        map.set(inst.id, { ...prev, cancelledCount: prev.cancelledCount + 1 });
      }
      return [...map.values()]
        .map((r) => ({
          ...r,
          uniqueClients: r.clients.size,
          cancelRate: pct(r.cancelledCount, r.paidCount + r.cancelledCount),
        }))
        .sort((a, b) => b.grossCents - a.grossCents);
    })();

    const classesLast30 = (() => {
      const map = new Map();
      for (const b of paidLast30) {
        const t = b?.classSession?.classTemplate;
        if (!t?.id) continue;
        const prev = map.get(t.id) || {
          id: t.id,
          title: t.title || "Class",
          grossCents: 0,
          paidCount: 0,
          clients: new Set(),
        };
        const next = {
          ...prev,
          grossCents: prev.grossCents + grossFor(b),
          paidCount: prev.paidCount + 1,
        };
        const clientId = b?.client?.id;
        if (clientId) next.clients.add(clientId);
        map.set(t.id, next);
      }
      return [...map.values()]
        .map((r) => ({ ...r, uniqueClients: r.clients.size }))
        .sort((a, b) => b.grossCents - a.grossCents);
    })();

    const clientCohorts = (() => {
      const byClient = new Map();
      for (const b of active) {
        const clientId = b?.client?.id;
        if (!clientId) continue;
        const created = parseDate(b.createdAt);
        if (!created) continue;
        const prev = byClient.get(clientId) || {
          id: clientId,
          name: b?.client?.name || b?.client?.email || "Client",
          firstBookingAt: created,
          lastBookingAt: created,
          paidCount: 0,
          bookingCount: 0,
        };
        const next = {
          ...prev,
          bookingCount: prev.bookingCount + 1,
          paidCount: prev.paidCount + (b.paid ? 1 : 0),
          firstBookingAt:
            created < prev.firstBookingAt ? created : prev.firstBookingAt,
          lastBookingAt:
            created > prev.lastBookingAt ? created : prev.lastBookingAt,
        };
        byClient.set(clientId, next);
      }

      const cutoff30 = addDays(now, -30);
      const cutoff90 = addDays(now, -90);
      if (!cutoff30 || !cutoff90) return null;

      const clients = [...byClient.values()];
      const activeLast30Clients = clients.filter(
        (c) => c.lastBookingAt >= cutoff30,
      );
      const active31to90 = clients.filter(
        (c) => c.lastBookingAt < cutoff30 && c.lastBookingAt >= cutoff90,
      );

      const newLast30 = clients.filter((c) => c.firstBookingAt >= cutoff30);
      const returningLast90 = clients.filter(
        (c) => c.lastBookingAt >= cutoff90 && c.paidCount >= 2,
      );
      const repeatRate90 = pct(
        returningLast90.length,
        clients.filter((c) => c.lastBookingAt >= cutoff90).length,
      );

      const avgPaidBookingsPerActive30 = (() => {
        if (activeLast30Clients.length === 0) return null;
        const paidCounts = activeLast30Clients.map((c) => c.paidCount);
        return paidCounts.reduce((a, b) => a + b, 0) / paidCounts.length;
      })();

      return {
        clientsTotal: clients.length,
        activeLast30Count: activeLast30Clients.length,
        dropoff31to90Count: active31to90.length,
        newLast30Count: newLast30.length,
        returningLast90Count: returningLast90.length,
        repeatRate90,
        avgPaidBookingsPerActive30,
      };
    })();

    const paidLast30GrossCents = paidLast30.reduce(
      (sum, b) => sum + grossFor(b),
      0,
    );

    return {
      funnel30,
      funnel7,
      weekBuckets,
      highestWeek,
      lowestWeek,
      weekDelta,
      topInstructorsLast30,
      classesLast30,
      clientCohorts,
      paidLast30GrossCents,
      paidLast30Count: paidLast30.length,
      paidLast90GrossCents: paidLast90.reduce((sum, b) => sum + grossFor(b), 0),
      paidLast90Count: paidLast90.length,
    };
  })();

  const loading = templatesLoading || sessionsLoading || bookingsLoading;

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Analytics
          </h1>
          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-800"
          >
            Back to dashboard
          </Link>
        </div>
        <p className="text-sm text-slate-400">
          Deeper views of the dashboard summary for owners and staff.
        </p>
      </header>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
          Loading analytics…
        </div>
      )}

      {!loading && (
        <>
          <Section
            id="revenue"
            title="Revenue trends"
            subtitle="12-week revenue and week-over-week changes (paid bookings)."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Paid revenue (30d)
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-50">
                  {formatCents(ownerAnalytics.paidLast30GrossCents, currency)}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {ownerAnalytics.paidLast30Count} paid bookings
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  This week vs last
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-50">
                  {ownerAnalytics.weekDelta
                    ? formatCents(
                        ownerAnalytics.weekDelta.changeCents,
                        currency,
                      )
                    : "—"}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {ownerAnalytics.weekDelta?.changePct == null
                    ? "—"
                    : `${Math.round(ownerAnalytics.weekDelta.changePct * 100)}%`}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Paid revenue (90d)
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-50">
                  {formatCents(ownerAnalytics.paidLast90GrossCents, currency)}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {ownerAnalytics.paidLast90Count} paid bookings
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <StatRow
                label="Highest week"
                value={
                  ownerAnalytics.highestWeek
                    ? formatCents(
                        ownerAnalytics.highestWeek.grossCents,
                        currency,
                      )
                    : "—"
                }
                helper={
                  ownerAnalytics.highestWeek
                    ? `${formatShortDate(ownerAnalytics.highestWeek.weekStart)}–${formatShortDate(addDays(ownerAnalytics.highestWeek.weekStart, 6))}`
                    : null
                }
              />
              <StatRow
                label="Lowest week"
                value={
                  ownerAnalytics.lowestWeek
                    ? formatCents(
                        ownerAnalytics.lowestWeek.grossCents,
                        currency,
                      )
                    : "—"
                }
                helper={
                  ownerAnalytics.lowestWeek
                    ? `${formatShortDate(ownerAnalytics.lowestWeek.weekStart)}–${formatShortDate(addDays(ownerAnalytics.lowestWeek.weekStart, 6))}`
                    : null
                }
              />
            </div>

            <div className="mt-4 overflow-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Week</th>
                    <th className="px-3 py-2">Paid bookings</th>
                    <th className="px-3 py-2">Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerAnalytics.weekBuckets.map((w) => (
                    <tr
                      key={w.weekStart.toISOString()}
                      className="border-t border-slate-800"
                    >
                      <td className="px-3 py-2 text-xs text-slate-300">
                        {formatShortDate(w.weekStart)}–
                        {formatShortDate(addDays(w.weekStart, 6))}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-300">
                        {w.paidCount}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-slate-100">
                        {formatCents(w.grossCents, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            id="sessions"
            title="Session demand (next 7d)"
            subtitle="Fill rates for upcoming sessions with capacity data."
          >
            {upcoming7.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                No upcoming sessions in the next 7 days.
              </div>
            ) : (
              <div className="overflow-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-left text-sm text-slate-200">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Start</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Instructor</th>
                      <th className="px-3 py-2">Capacity</th>
                      <th className="px-3 py-2">Seats left</th>
                      <th className="px-3 py-2">Fill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming7.map((s) => {
                      const cap =
                        typeof s.capacity === "number" ? s.capacity : null;
                      const seats =
                        typeof s.seatsAvailable === "number"
                          ? s.seatsAvailable
                          : null;
                      const fill =
                        cap != null && seats != null && cap > 0
                          ? Math.max(0, Math.min(1, (cap - seats) / cap))
                          : null;
                      return (
                        <tr key={s.id} className="border-t border-slate-800">
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {new Date(s.startTime).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-sm text-slate-50">
                            {s.classTemplate?.title || "Class"}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {s.instructor?.name || "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {cap ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {seats ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-xs font-semibold text-slate-100">
                            {fill == null ? "—" : `${Math.round(fill * 100)}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section
            id="funnel"
            title="Booking funnel"
            subtitle="How many bookings are created, paid, and cancelled."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Last 7 days
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <StatRow
                    label="Created"
                    value={ownerAnalytics.funnel7.created}
                  />
                  <StatRow
                    label="Paid"
                    value={ownerAnalytics.funnel7.paidCount}
                  />
                  <StatRow
                    label="Unpaid"
                    value={ownerAnalytics.funnel7.unpaid}
                  />
                  <StatRow
                    label="Cancelled"
                    value={ownerAnalytics.funnel7.cancelled}
                  />
                </div>
                <div className="mt-3 text-sm text-slate-300">
                  Paid rate:{" "}
                  <span className="font-semibold text-slate-50">
                    {ownerAnalytics.funnel7.paidRate == null
                      ? "—"
                      : `${Math.round(ownerAnalytics.funnel7.paidRate * 100)}%`}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  Last 30 days
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <StatRow
                    label="Created"
                    value={ownerAnalytics.funnel30.created}
                  />
                  <StatRow
                    label="Paid"
                    value={ownerAnalytics.funnel30.paidCount}
                  />
                  <StatRow
                    label="Unpaid"
                    value={ownerAnalytics.funnel30.unpaid}
                  />
                  <StatRow
                    label="Cancelled"
                    value={ownerAnalytics.funnel30.cancelled}
                  />
                </div>
                <div className="mt-3 text-sm text-slate-300">
                  Paid rate:{" "}
                  <span className="font-semibold text-slate-50">
                    {ownerAnalytics.funnel30.paidRate == null
                      ? "—"
                      : `${Math.round(ownerAnalytics.funnel30.paidRate * 100)}%`}
                  </span>
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="retention"
            title="Client retention"
            subtitle="Cohort-style rollups based on booking activity."
          >
            {!ownerAnalytics.clientCohorts ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                Not enough data to compute retention.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatRow
                  label="Total clients"
                  value={ownerAnalytics.clientCohorts.clientsTotal}
                />
                <StatRow
                  label="Active (30d)"
                  value={ownerAnalytics.clientCohorts.activeLast30Count}
                  helper={`${ownerAnalytics.clientCohorts.newLast30Count} new`}
                />
                <StatRow
                  label="Dropped (31–90d)"
                  value={ownerAnalytics.clientCohorts.dropoff31to90Count}
                />
                <StatRow
                  label="Repeat rate (90d)"
                  value={
                    ownerAnalytics.clientCohorts.repeatRate90 == null
                      ? "—"
                      : `${Math.round(ownerAnalytics.clientCohorts.repeatRate90 * 100)}%`
                  }
                  helper={`${ownerAnalytics.clientCohorts.returningLast90Count} repeat clients`}
                />
                <StatRow
                  label="Avg paid bookings / active client (30d)"
                  value={
                    ownerAnalytics.clientCohorts.avgPaidBookingsPerActive30 ==
                    null
                      ? "—"
                      : ownerAnalytics.clientCohorts.avgPaidBookingsPerActive30.toFixed(
                          1,
                        )
                  }
                />
              </div>
            )}
          </Section>

          <Section
            id="instructors"
            title="Instructor performance (30d)"
            subtitle="Ranked by paid booking revenue."
          >
            {ownerAnalytics.topInstructorsLast30.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                No paid bookings in the last 30 days.
              </div>
            ) : (
              <div className="overflow-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-left text-sm text-slate-200">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Instructor</th>
                      <th className="px-3 py-2">Paid bookings</th>
                      <th className="px-3 py-2">Clients</th>
                      <th className="px-3 py-2">Cancel rate</th>
                      <th className="px-3 py-2">Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerAnalytics.topInstructorsLast30.map((i) => (
                      <tr key={i.id} className="border-t border-slate-800">
                        <td className="px-3 py-2 text-sm text-slate-50">
                          {i.name}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-300">
                          {i.paidCount}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-300">
                          {i.uniqueClients}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-300">
                          {i.cancelRate == null
                            ? "—"
                            : `${Math.round(i.cancelRate * 100)}%`}
                        </td>
                        <td className="px-3 py-2 text-sm font-semibold text-slate-100">
                          {formatCents(i.grossCents, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section
            id="classes"
            title="Classes (30d)"
            subtitle="All classes ranked by paid booking revenue."
          >
            {ownerAnalytics.classesLast30.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-400">
                No paid bookings in the last 30 days.
              </div>
            ) : (
              <div className="overflow-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-left text-sm text-slate-200">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">Paid bookings</th>
                      <th className="px-3 py-2">Clients</th>
                      <th className="px-3 py-2">Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerAnalytics.classesLast30.map((t) => (
                      <tr key={t.id} className="border-t border-slate-800">
                        <td className="px-3 py-2 text-sm text-slate-50">
                          {t.title}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-300">
                          {t.paidCount}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-300">
                          {t.uniqueClients}
                        </td>
                        <td className="px-3 py-2 text-sm font-semibold text-slate-100">
                          {formatCents(t.grossCents, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
