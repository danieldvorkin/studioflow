import { Link } from "react-router-dom";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useEffect, useRef, useState } from "react";

function AnimatedRevBar({ value, maxValue, color, delay = 0 }) {
  const ref = useRef(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const pct = Math.round((value / maxValue) * 100);
  return (
    <div
      ref={ref}
      className={`h-2 w-full rounded-full bg-slate-800 overflow-hidden`}
    >
      <div
        className={`h-2 rounded-full ${color}`}
        style={{
          width: animated ? `${pct}%` : "0%",
          transition: `width 0.8s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms`,
        }}
      />
    </div>
  );
}

function OwnerDashMockup() {
  const metrics = [
    {
      label: "Revenue MTD",
      value: "$18,420",
      change: "+14%",
      color: "text-emerald-400",
    },
    { label: "Fill Rate", value: "91%", change: "+6%", color: "text-sky-400" },
    {
      label: "Active Clients",
      value: "142",
      change: "+8",
      color: "text-violet-400",
    },
    {
      label: "Sessions This Month",
      value: "87",
      change: "+12",
      color: "text-amber-400",
    },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl">
      <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-300">
          Owner Dashboard · March 2026
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />{" "}
          Live
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
            >
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                {m.label}
              </div>
              <div className={`text-xl font-bold mt-1 ${m.color}`}>
                {m.value}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                {m.change} this month
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2.5">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            Location breakdown
          </div>
          {[
            {
              name: "Studio Soho",
              rev: 10200,
              max: 12000,
              color: "bg-gradient-to-r from-sky-500 to-indigo-500",
            },
            {
              name: "Studio Midtown",
              rev: 5800,
              max: 12000,
              color: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
            },
            {
              name: "Studio Brooklyn",
              rev: 2420,
              max: 12000,
              color: "bg-gradient-to-r from-emerald-500 to-teal-500",
            },
          ].map((loc, i) => (
            <div key={loc.name} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">{loc.name}</span>
                <span className="font-semibold text-slate-200">
                  ${loc.rev.toLocaleString()}
                </span>
              </div>
              <AnimatedRevBar
                value={loc.rev}
                maxValue={loc.max}
                color={loc.color}
                delay={i * 150}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
          <span className="text-xs text-slate-400">
            Total payouts this month
          </span>
          <span className="text-sm font-bold text-emerald-400">
            $6,840 → 4 instructors
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ForOwners() {
  useDocumentTitle("For Studio Owners — StudioFlow");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute top-[60vh] right-0 h-[36rem] w-[36rem] rounded-full bg-violet-600/8 blur-3xl" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-[0.28em] uppercase">
              <span className="text-sky-400">Studio</span>
              <span className="text-slate-200">Flow</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-xs font-medium text-slate-400 md:flex">
            <Link to="/#features" className="hover:text-white transition">
              Features
            </Link>
            <Link to="/for-instructors" className="hover:text-white transition">
              For Instructors
            </Link>
            <Link to="/for-clients" className="hover:text-white transition">
              For Clients
            </Link>
            <Link to="/contact" className="hover:text-white transition">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link
              to="/signin"
              className="text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Sign in
            </Link>
            <Link
              to="/signup/owner"
              className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400 transition"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400 mb-6">
            For Studio Owners
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-white md:text-6xl leading-[1.05]">
            Run your studio.{" "}
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Not your inbox.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-slate-400">
            StudioFlow gives studio owners complete operational control —
            scheduling, bookings, payments, instructor payouts, and analytics —
            without the spreadsheets, the text threads, or the late Sunday
            nights.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup/owner"
              className="inline-flex items-center rounded-xl bg-sky-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-sky-400 transition"
            >
              Start your studio free →
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
            >
              Talk to us
            </Link>
          </div>
        </section>

        {/* Mockup */}
        <section className="mx-auto max-w-3xl px-4 pb-16">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-sky-500/20 via-indigo-500/10 to-violet-500/10 blur-2xl" />
            <div className="relative">
              <OwnerDashMockup />
            </div>
          </div>
        </section>

        {/* Core problems solved */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-12">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400">
              What changes
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Everything your studio runs on, unified.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "📅",
                title: "Schedule management",
                color: "border-sky-500/20 bg-sky-500/5",
                accent: "text-sky-400",
                body: "Create class templates once, then spin up sessions with a click. Capacity limits, instructor assignments, and location tagging — all in one place. No more double-bookings.",
              },
              {
                icon: "💳",
                title: "Automatic payments",
                color: "border-emerald-500/20 bg-emerald-500/5",
                accent: "text-emerald-400",
                body: "Payment is collected at the moment of booking via Stripe. Cards saved on file. No invoicing, no chasing, no awkward cash exchanges after class.",
              },
              {
                icon: "💰",
                title: "Instructor payouts",
                color: "border-violet-500/20 bg-violet-500/5",
                accent: "text-violet-400",
                body: "StudioFlow calculates per-session earnings automatically. Monthly payout reports are generated in seconds, with full audit trails. Export to CSV for your accountant in one click.",
              },
              {
                icon: "📊",
                title: "Owner analytics",
                color: "border-amber-500/20 bg-amber-500/5",
                accent: "text-amber-400",
                body: "Revenue, fill rates, booking trends, and top-performing classes — live, always current. See the whole picture across every location without switching dashboards.",
              },
              {
                icon: "📍",
                title: "Multi-location control",
                color: "border-fuchsia-500/20 bg-fuchsia-500/5",
                accent: "text-fuchsia-400",
                body: "Run two studios or twenty from a single owner dashboard. Each location has its own schedule and analytics, but everything rolls up to your master view.",
              },
              {
                icon: "📦",
                title: "Memberships & bundles",
                color: "border-indigo-500/20 bg-indigo-500/5",
                accent: "text-indigo-400",
                body: "Sell class packs and recurring memberships. Usage is tracked automatically — clients always know how many sessions remain, and you never have to manage it manually.",
              },
            ].map(({ icon, title, color, accent, body }) => (
              <div key={title} className={`rounded-2xl border ${color} p-6`}>
                <div className="text-3xl mb-4">{icon}</div>
                <div className={`text-sm font-bold ${accent} mb-2`}>
                  {title}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Before/After */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-10">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-rose-400">
              The real cost of not switching
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Your current setup has a price tag. You just can't see it.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 space-y-3">
              <div className="text-sm font-bold text-rose-400 uppercase tracking-widest mb-4">
                Before StudioFlow
              </div>
              {[
                "Sunday nights reconciling spreadsheets",
                "Chasing instructors about how many classes they taught",
                "DMs and texts for every client booking",
                "No idea of revenue until the end of the month",
                "Disputed payout calculations every month",
                "Waitlists managed in your head",
                "Zero visibility into your best-performing classes",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 text-sm text-slate-400"
                >
                  <span className="text-rose-500 shrink-0 mt-0.5">✕</span>{" "}
                  {item}
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-3">
              <div className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4">
                With StudioFlow
              </div>
              {[
                "Monthly payout reports generated in seconds",
                "Every session tracked automatically, no ambiguity",
                "Clients book themselves — at any hour",
                "Revenue visible live, every day",
                "Payouts calculated with a full audit trail",
                "Waitlists handled automatically when spots open",
                "Analytics surfaced so you always know what's working",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 text-sm text-slate-300"
                >
                  <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>{" "}
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API teaser */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-sky-500/5 to-transparent p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                StudioFlow API · v1
              </div>
              <h3 className="text-xl font-bold text-white">
                Build on top of your studio data.
              </h3>
              <p className="text-sm text-slate-400 max-w-lg">
                Owners can generate long-lived API tokens and connect StudioFlow
                to any tool — Notion, Slack, Google Sheets, Zapier, or custom
                scripts. Your data, your automation, your way.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                {[
                  "REST API",
                  "Bearer token auth",
                  "JSON",
                  "Owner-only access",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-indigo-700/50 bg-indigo-900/30 px-2.5 py-1 text-[10px] font-semibold text-indigo-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5 shrink-0">
              <Link
                to="/for-developers"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-indigo-400 transition"
              >
                Explore the API →
              </Link>
              <Link
                to="/api-docs"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition text-center"
              >
                View docs
              </Link>
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="mx-auto max-w-4xl px-4 py-8 pb-24">
          <div className="grid gap-5 md:grid-cols-2">
            {[
              {
                quote:
                  "I used to spend Sunday nights reconciling spreadsheets and chasing Venmos. Now I look at one screen and everything's just… done.",
                name: "Priya Anand",
                role: "Owner, Meridian Pilates · Austin, TX",
                avatar: "PA",
                gradient: "from-violet-500 to-indigo-600",
              },
              {
                quote:
                  "We run three locations. Before StudioFlow, coordinating that was a nightmare. Now it's just Tuesday.",
                name: "Dana Park",
                role: "Founder, Park Method Studios · Los Angeles, CA",
                avatar: "DP",
                gradient: "from-amber-500 to-orange-600",
              },
            ].map(({ quote, name, role, avatar, gradient }) => (
              <div
                key={name}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-amber-400">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed italic">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[11px] font-bold text-white`}
                  >
                    {avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-100">
                      {name}
                    </div>
                    <div className="text-[11px] text-slate-500">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-10 text-center">
            <h2 className="text-3xl font-bold text-white">
              Ready to stop guessing?
            </h2>
            <p className="mt-3 text-slate-400 max-w-sm mx-auto">
              Set up in minutes. No contract. You'll know on day one.
            </p>
            <Link
              to="/signup/owner"
              className="mt-6 inline-flex items-center rounded-xl bg-sky-500 px-8 py-3.5 text-sm font-bold text-slate-950 hover:bg-sky-400 transition"
            >
              Start your studio free →
            </Link>
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-800/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-600 md:flex-row">
          <Link to="/" className="font-bold tracking-widest uppercase">
            <span className="text-sky-500/60">Studio</span>Flow
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-slate-400 transition">
              Home
            </Link>
            <Link
              to="/for-instructors"
              className="hover:text-slate-400 transition"
            >
              For Instructors
            </Link>
            <Link to="/for-clients" className="hover:text-slate-400 transition">
              For Clients
            </Link>
            <Link to="/team" className="hover:text-slate-400 transition">
              Team
            </Link>
            <Link to="/contact" className="hover:text-slate-400 transition">
              Contact
            </Link>
          </div>
          <div>© {new Date().getFullYear()} StudioFlow</div>
        </div>
      </footer>
    </div>
  );
}
