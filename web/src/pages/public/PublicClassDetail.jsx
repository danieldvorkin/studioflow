import { useQuery } from "@apollo/client";
import { Link, useParams } from "react-router-dom";
import { PUBLIC_CLASS_PAGE } from "../../apollo/queries";
import { useAuth } from "../../auth/AuthProvider";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useCurrency } from "../../currency/CurrencyProvider";

function InstructorAvatar({ instructor, size = "sm" }) {
  const sizeClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  if (!instructor) return null;
  if (instructor.avatarUrl) {
    return (
      <img
        src={instructor.avatarUrl}
        alt={instructor.name || "Instructor"}
        className={`${sizeClass} rounded-full object-cover ring-1 ring-slate-700`}
      />
    );
  }
  const initials = (instructor.name || "?")
    .split(" ")
    .filter((s) => s)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <span
      className={`${sizeClass} inline-flex items-center justify-center rounded-full bg-sky-500/20 font-semibold text-sky-300`}
    >
      {initials}
    </span>
  );
}

function SlotRow({ session, studioCode, isLoggedIn }) {
  const d = new Date(session.startTime);
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const dateStr = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const soldOut =
    typeof session.seatsAvailable === "number" && session.seatsAvailable <= 0;

  const bookHref = isLoggedIn
    ? `/booking/${session.id}`
    : `/signup/client?code=${encodeURIComponent(studioCode)}&redirect=${encodeURIComponent(`/booking/${session.id}`)}`;

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3.5 transition-colors ${
        soldOut
          ? "border-amber-800/30 bg-amber-950/10"
          : "border-slate-700/60 bg-slate-900/70 hover:border-sky-500/40 hover:bg-slate-900"
      }`}
    >
      <div className="flex min-w-0 items-center gap-4">
        {/* Date block */}
        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-slate-700/60 bg-slate-800/60 px-2 py-1.5 text-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {weekday}
          </span>
          <span className="text-base font-bold text-slate-50">
            {dateStr.split(" ")[1]}
          </span>
          <span className="text-[10px] text-slate-500">
            {dateStr.split(" ")[0]}
          </span>
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-50">{time}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            {session.instructor && (
              <span className="inline-flex items-center gap-1.5">
                <InstructorAvatar instructor={session.instructor} size="sm" />
                {session.instructor.name}
              </span>
            )}
            {session.room && <span>· Room {session.room}</span>}
            {!soldOut && typeof session.seatsAvailable === "number" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                {session.seatsAvailable} spot
                {session.seatsAvailable !== 1 ? "s" : ""} left
              </span>
            )}
            {soldOut && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                Waitlist open
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0">
        {soldOut ? (
          <Link
            to={bookHref}
            className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20 transition-all"
          >
            Join waitlist
          </Link>
        ) : (
          <Link
            to={bookHref}
            className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 transition-all"
          >
            {isLoggedIn ? "Book now" : "Sign up & book"}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PublicClassDetail() {
  const { studioCode, templateId } = useParams();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const { formatPrice } = useCurrency();

  const { data, loading, error } = useQuery(PUBLIC_CLASS_PAGE, {
    variables: { studioInviteCode: studioCode, templateId },
    fetchPolicy: "cache-and-network",
    pollInterval: 30_000,
  });

  const page = data?.publicClassPage;
  const template = page?.template;
  const sessions = page?.upcomingSessions ?? [];
  const studioName = page?.studioName;

  useDocumentTitle(template?.title ?? "Class");

  const now = new Date();
  const upcomingSessions = sessions.filter((s) => new Date(s.startTime) > now);

  const availableCount = upcomingSessions.filter(
    (s) => typeof s.seatsAvailable !== "number" || s.seatsAvailable > 0,
  ).length;

  const priceDisplay =
    template?.priceCents != null
      ? formatPrice(template.priceCents, template.currency)
      : null;

  const durationLabel = template?.durationMinutes
    ? `${template.durationMinutes} min`
    : null;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="text-center">
          <div className="text-4xl">🤸</div>
          <h1 className="mt-4 text-xl font-semibold text-slate-50">
            Class not found
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            This link may be expired or incorrect.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Minimal nav bar */}
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="text-sm font-semibold text-slate-100">
            {loading ? (
              <span className="h-4 w-32 rounded bg-slate-800 animate-pulse inline-block" />
            ) : (
              studioName || "Pilates Studio"
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Sign in
                </Link>
                <Link
                  to={`/signup/client?code=${encodeURIComponent(studioCode)}`}
                  className="rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400"
                >
                  Join free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 flex flex-col gap-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 p-8 shadow-xl shadow-black/30">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-500/8 blur-3xl" />

          <div className="relative">
            {loading ? (
              <div className="space-y-3">
                <div className="h-9 w-64 rounded-xl bg-slate-800 animate-pulse" />
                <div className="h-4 w-96 rounded-lg bg-slate-800 animate-pulse" />
                <div className="h-4 w-80 rounded-lg bg-slate-800 animate-pulse" />
              </div>
            ) : (
              <>
                {studioName && (
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-400/80">
                    {studioName}
                  </div>
                )}
                <h1 className="text-3xl font-bold tracking-tight text-slate-50 md:text-4xl">
                  {template?.title ?? "Class"}
                </h1>

                {template?.description && (
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
                    {template.description}
                  </p>
                )}

                {/* Meta chips */}
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {template?.instructor?.name && (
                    <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/60 px-3.5 py-1.5">
                      <InstructorAvatar
                        instructor={template.instructor}
                        size="sm"
                      />
                      <span className="text-xs font-medium text-slate-200">
                        {template.instructor.name}
                      </span>
                    </div>
                  )}
                  {durationLabel && (
                    <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/60 px-3.5 py-1.5">
                      <span className="text-xs text-slate-400">⏱</span>
                      <span className="text-xs font-medium text-slate-200">
                        {durationLabel}
                      </span>
                    </div>
                  )}
                  {priceDisplay && (
                    <div className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1.5">
                      <span className="text-xs font-bold text-sky-300">
                        {priceDisplay}
                      </span>
                      <span className="text-[10px] text-sky-400/60">
                        per session
                      </span>
                    </div>
                  )}
                  {template?.studioLocation?.name && (
                    <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-800/60 px-3.5 py-1.5">
                      <span className="text-xs text-slate-400">📍</span>
                      <span className="text-xs font-medium text-slate-200">
                        {template.studioLocation.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Primary CTA */}
                {!loading && availableCount > 0 && (
                  <div className="mt-8">
                    <a
                      href="#pick-a-time"
                      className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 hover:bg-sky-400 transition-all"
                    >
                      Reserve your spot
                      <span className="text-sky-200">↓</span>
                    </a>
                    {!isLoggedIn && (
                      <p className="mt-3 text-[11px] text-slate-500">
                        No account needed to browse.{" "}
                        <Link
                          to={`/signup/client?code=${encodeURIComponent(studioCode)}`}
                          className="text-sky-400 hover:text-sky-300"
                        >
                          Sign up free
                        </Link>{" "}
                        before booking.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* What to expect */}
        {!loading && template && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: "🎯",
                label: "Expert instruction",
                desc: template.instructor?.name
                  ? `Led by ${template.instructor.name}`
                  : "Led by certified instructors",
              },
              {
                icon: "📅",
                label: "Flexible scheduling",
                desc: `${availableCount} upcoming time${availableCount !== 1 ? "s" : ""} to choose from`,
              },
              {
                icon: "✨",
                label: "Easy booking",
                desc: "Reserve in seconds, cancel anytime",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="text-2xl">{item.icon}</div>
                <div className="mt-2 text-sm font-semibold text-slate-100">
                  {item.label}
                </div>
                <div className="mt-1 text-xs text-slate-400">{item.desc}</div>
              </div>
            ))}
          </section>
        )}

        {/* Time slot picker */}
        <section id="pick-a-time">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-slate-50">Pick a time</h2>
            {!loading && availableCount > 0 && (
              <span className="text-xs text-slate-500">
                {availableCount} slot{availableCount !== 1 ? "s" : ""} available
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[76px] rounded-2xl border border-slate-800 bg-slate-900/60 animate-pulse"
                />
              ))}
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
              <div className="text-3xl">📭</div>
              <p className="mt-3 text-sm text-slate-400">
                No upcoming sessions are scheduled yet.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Check back soon or contact the studio.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {upcomingSessions.map((s) => (
                <li key={s.id}>
                  <SlotRow
                    session={s}
                    studioCode={studioCode}
                    isLoggedIn={isLoggedIn}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Footer CTA for guests */}
        {!loading && !isLoggedIn && availableCount > 0 && (
          <section className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6 text-center">
            <h3 className="text-base font-bold text-slate-50">
              Ready to join?
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Create a free account to book your spot in seconds.
            </p>
            <Link
              to={`/signup/client?code=${encodeURIComponent(studioCode)}`}
              className="mt-4 inline-flex items-center rounded-full bg-sky-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 hover:bg-sky-400 transition-all"
            >
              Create free account
            </Link>
            <p className="mt-3 text-xs text-slate-500">
              Already have an account?{" "}
              <Link to="/signin" className="text-sky-400 hover:text-sky-300">
                Sign in
              </Link>
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
