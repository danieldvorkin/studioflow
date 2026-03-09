import { useQuery } from "@apollo/client";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  CLASS_SESSIONS,
  CLASS_TEMPLATES,
  MY_BOOKINGS,
} from "../../apollo/queries";
import { useStudio } from "../../studio/StudioProvider";
import { useAuth } from "../../auth/AuthProvider";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useCurrency } from "../../currency/CurrencyProvider";

function SlotCard({ session, booking }) {
  const d = new Date(session.startTime);
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const dateNum = d.toLocaleDateString(undefined, { day: "numeric" });
  const month = d.toLocaleDateString(undefined, { month: "short" });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const soldOut =
    typeof session.seatsAvailable === "number" && session.seatsAvailable <= 0;

  const wrapperClass = [
    "flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 transition-colors",
    booking
      ? "border-emerald-800/50 bg-emerald-950/30"
      : soldOut
        ? "border-amber-800/30 bg-amber-950/10"
        : "border-slate-700/60 bg-slate-900/70 hover:border-sky-500/40 hover:bg-slate-900",
  ].join(" ");

  return (
    <div className={wrapperClass}>
      <div className="flex min-w-0 items-center gap-4">
        {/* Calendar date chip */}
        <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-slate-700/60 bg-slate-800/60 px-1.5 py-1.5 text-center">
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {weekday}
          </span>
          <span className="text-lg font-bold leading-tight text-slate-50">
            {dateNum}
          </span>
          <span className="text-[9px] text-slate-500">{month}</span>
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-50">{time}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            {session.instructor?.name && <span>{session.instructor.name}</span>}
            {session.room && <span>· Room {session.room}</span>}
            {!soldOut &&
              !booking &&
              typeof session.seatsAvailable === "number" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  {session.seatsAvailable} spot
                  {session.seatsAvailable !== 1 ? "s" : ""} left
                </span>
              )}
            {soldOut && !booking && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                Waitlist open
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1.5">
        {booking ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Booked
            </span>
            <Link
              to={`/bookings/${booking.id}`}
              className="text-[11px] text-slate-400 hover:text-slate-200"
            >
              View details →
            </Link>
          </>
        ) : soldOut ? (
          <Link
            to={`/booking/${session.id}`}
            className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 transition-all"
          >
            Join waitlist
          </Link>
        ) : (
          <Link
            to={`/booking/${session.id}`}
            className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 transition-all"
          >
            Book now
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ClassDetail() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { selectedStudioId } = useStudio();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const roleName = (user?.roleName || "").toString().toLowerCase();
  const isClientUser = roleName === "client";

  const { data: templatesData, loading: templatesLoading } = useQuery(
    CLASS_TEMPLATES,
    {
      variables: { studioId: isClientUser ? selectedStudioId : null },
      skip: isClientUser && !selectedStudioId,
    },
  );

  const { data: sessionsData, loading: sessionsLoading } = useQuery(
    CLASS_SESSIONS,
    {
      variables: {
        from: null,
        to: null,
        studioId: isClientUser ? selectedStudioId : null,
      },
      skip: isClientUser && !selectedStudioId,
      fetchPolicy: "cache-and-network",
      pollInterval: 30_000,
    },
  );

  const { data: myBookingsData, loading: bookingsLoading } = useQuery(
    MY_BOOKINGS,
    {
      skip: !user,
      variables: selectedStudioId ? { studioId: selectedStudioId } : {},
      fetchPolicy: "cache-and-network",
    },
  );

  const template =
    (templatesData?.classTemplates || []).find((t) => t.id === templateId) ||
    null;

  const now = new Date();

  const sessions = (sessionsData?.classSessions || [])
    .filter((s) => s.classTemplate?.id === templateId)
    .filter((s) => new Date(s.startTime) > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const myBookings = (myBookingsData?.myBookings || []).filter(
    (b) => b?.status !== "cancelled" && !b?.archived,
  );
  const bookingBySessionId = new Map(
    myBookings.map((b) => [b?.classSession?.id, b]).filter(([sid]) => !!sid),
  );

  const loading = templatesLoading || sessionsLoading || bookingsLoading;

  useDocumentTitle(template?.title ?? "Class");

  const availableCount = sessions.filter(
    (s) =>
      !bookingBySessionId.has(s.id) &&
      (typeof s.seatsAvailable !== "number" || s.seatsAvailable > 0),
  ).length;

  const priceDisplay =
    template?.priceCents != null
      ? formatPrice(template.priceCents, template.currency)
      : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      {/* Back nav */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 p-6 shadow-xl shadow-black/30 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-violet-500/8 blur-3xl" />

        <div className="relative">
          {loading && !template ? (
            <div className="space-y-3">
              <div className="h-8 w-52 rounded-xl bg-slate-800 animate-pulse" />
              <div className="h-4 w-80 rounded-lg bg-slate-800 animate-pulse" />
              <div className="h-4 w-64 rounded-lg bg-slate-800 animate-pulse" />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-slate-50">
                {template?.title ?? "Class"}
              </h1>

              {template?.description && (
                <p className="mt-3 text-sm leading-relaxed text-slate-300 max-w-lg">
                  {template.description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2.5">
                {template?.instructor?.name && (
                  <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/60 px-3.5 py-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500/20 text-[9px] text-sky-300">
                      ✦
                    </span>
                    <span className="text-xs font-medium text-slate-200">
                      {template.instructor.name}
                    </span>
                  </div>
                )}
                {template?.durationMinutes && (
                  <div className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/60 px-3.5 py-1.5">
                    <span className="text-[11px] text-slate-400">⏱</span>
                    <span className="text-xs font-medium text-slate-200">
                      {template.durationMinutes} min
                    </span>
                  </div>
                )}
                {priceDisplay && (
                  <div className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1.5">
                    <span className="text-xs font-bold text-sky-300">
                      {priceDisplay}
                    </span>
                    <span className="text-[10px] text-sky-400/60">
                      / session
                    </span>
                  </div>
                )}
                {template?.studioLocation?.name && (
                  <div className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/60 px-3.5 py-1.5">
                    <span className="text-[11px] text-slate-400">📍</span>
                    <span className="text-xs font-medium text-slate-200">
                      {template.studioLocation.name}
                    </span>
                  </div>
                )}
              </div>

              {!loading && availableCount > 0 && (
                <div className="mt-6">
                  <a
                    href="#pick-a-time"
                    className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition-all"
                  >
                    Reserve your spot
                    <span className="text-sky-200 text-xs">↓</span>
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick stats */}
      {!loading && template && availableCount > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: "📅",
              value: `${availableCount} open`,
              label: "time slots",
            },
            {
              icon: "⏱",
              value: template.durationMinutes
                ? `${template.durationMinutes} min`
                : "—",
              label: "per session",
            },
            { icon: "✅", value: "Easy", label: "cancellation" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-3 text-center"
            >
              <div className="text-xl">{s.icon}</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                {s.value}
              </div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Time slots */}
      <div id="pick-a-time">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-50">Pick a time</h2>
          {!loading && availableCount > 0 && (
            <span className="text-xs text-slate-500">
              {availableCount} slot{availableCount !== 1 ? "s" : ""} available
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[74px] rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
            <div className="text-3xl">📭</div>
            <p className="mt-3 text-sm text-slate-400">
              No upcoming sessions scheduled.
            </p>
            <Link
              to="/schedule"
              className="mt-3 inline-flex items-center rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Browse the full schedule
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {sessions.map((s) => (
              <li key={s.id}>
                <SlotCard
                  session={s}
                  booking={bookingBySessionId.get(s.id) ?? null}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
