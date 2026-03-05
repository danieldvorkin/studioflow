import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useEffect, useRef, useState } from "react";

function AnimatedBar({ pct, color, delay = 0 }) {
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
  return (
    <div
      ref={ref}
      className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden"
    >
      <div
        className={`h-1.5 rounded-full ${color}`}
        style={{
          width: animated ? `${pct}%` : "0%",
          transition: `width 0.8s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms`,
        }}
      />
    </div>
  );
}

function InstructorScheduleMockup() {
  const sessions = [
    {
      time: "7:00 AM",
      name: "Reformer Flow",
      clients: 8,
      cap: 8,
      status: "Full",
      sc: "bg-emerald-500/20 text-emerald-300",
    },
    {
      time: "10:00 AM",
      name: "Mat Pilates",
      clients: 6,
      cap: 10,
      status: "Open",
      sc: "bg-sky-500/20 text-sky-300",
    },
    {
      time: "12:30 PM",
      name: "Tower Strength",
      clients: 5,
      cap: 8,
      status: "Open",
      sc: "bg-sky-500/20 text-sky-300",
    },
    {
      time: "5:30 PM",
      name: "Private — Sarah T.",
      clients: 1,
      cap: 1,
      status: "VIP",
      sc: "bg-fuchsia-500/20 text-fuchsia-300",
    },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl">
      <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-300">
          My Schedule · Thursday
        </div>
        <div className="text-[10px] text-violet-400 font-semibold">
          Maria L.
        </div>
      </div>
      <div className="p-4 space-y-2">
        {sessions.map((s, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 flex items-center gap-3"
          >
            <div className="w-14 shrink-0 text-[11px] font-semibold text-slate-400">
              {s.time}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-100 truncate">
                {s.name}
              </div>
              <AnimatedBar
                pct={Math.round((s.clients / s.cap) * 100)}
                color="bg-gradient-to-r from-violet-500 to-indigo-400"
                delay={i * 120}
              />
              <div className="text-[10px] text-slate-500 mt-0.5">
                {s.clients}/{s.cap} clients
              </div>
            </div>
            <div
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.sc}`}
            >
              {s.status}
            </div>
          </div>
        ))}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["20", "sessions this mo"],
            ["$1,600", "earnings MTD"],
            ["97%", "attendance"],
          ].map(([v, l]) => (
            <div
              key={l}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 text-center"
            >
              <div className="text-base font-bold text-violet-400">{v}</div>
              <div className="text-[9px] text-slate-500">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PayoutDetailMockup() {
  const sessions = [
    { date: "Mar 1", name: "Reformer Flow", rate: "$80", status: "Paid" },
    { date: "Mar 3", name: "Mat Pilates", rate: "$65", status: "Paid" },
    { date: "Mar 5", name: "Tower Strength", rate: "$80", status: "Pending" },
    { date: "Mar 7", name: "Private — Sarah T.", rate: "$120", status: "Paid" },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl">
      <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-300">
          My earnings · March
        </div>
        <div className="text-xs font-bold text-violet-400">$1,600 total</div>
      </div>
      <div className="p-4 space-y-2">
        {sessions.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="text-[10px] text-slate-500 w-10">{s.date}</div>
              <div className="text-sm text-slate-200">{s.name}</div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-slate-200">
                {s.rate}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.status === "Paid" ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"}`}
              >
                {s.status}
              </span>
            </div>
          </div>
        ))}
        <div className="mt-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            No disputes. No spreadsheets.
          </span>
          <span className="text-[10px] font-semibold text-violet-400">
            Export CSV →
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ForInstructors() {
  useDocumentTitle("For Instructors — StudioFlow");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute top-[60vh] right-0 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/8 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link
            to="/"
            className="text-sm font-bold tracking-[0.28em] uppercase"
          >
            <span className="text-sky-400">Studio</span>
            <span className="text-slate-200">Flow</span>
          </Link>
          <nav className="hidden items-center gap-6 text-xs font-medium text-slate-400 md:flex">
            <Link to="/for-owners" className="hover:text-white transition">
              For Owners
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
              to="/signup"
              className="rounded-full bg-violet-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-violet-400 transition"
            >
              Join a studio
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400 mb-6">
            For Instructors &amp; Staff
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-white md:text-6xl leading-[1.05]">
            Stay in the work.{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Out of the admin.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-slate-400">
            Your schedule, your clients, your earnings — all in one clear view.
            No spreadsheets, no disputed payouts, no back-and-forth with the
            front desk.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center rounded-xl bg-violet-500 px-6 py-3 text-sm font-bold text-white hover:bg-violet-400 transition"
            >
              Get started free →
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
            >
              Talk to us
            </Link>
          </div>
        </section>

        {/* Mockups */}
        <section className="mx-auto max-w-5xl px-4 pb-16 grid gap-8 md:grid-cols-2">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-violet-500/10 blur-2xl" />
            <div className="relative">
              <InstructorScheduleMockup />
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-fuchsia-500/10 blur-2xl" />
            <div className="relative">
              <PayoutDetailMockup />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Everything you need. Nothing you don't.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "🗓️",
                title: "Your schedule, always clear",
                accent: "text-violet-400",
                border: "border-violet-500/20 bg-violet-500/5",
                body: "See every session you're teaching — today, this week, this month. Capacity, client count, and location at a glance. No hunting through spreadsheets.",
              },
              {
                icon: "👥",
                title: "Client roster per session",
                accent: "text-fuchsia-400",
                border: "border-fuchsia-500/20 bg-fuchsia-500/5",
                body: "See exactly who's booked into each of your classes, mark attendance, and view client notes — all from the session view.",
              },
              {
                icon: "💸",
                title: "Payout history you can trust",
                accent: "text-emerald-400",
                border: "border-emerald-500/20 bg-emerald-500/5",
                body: "Every session you teach is tracked. Your monthly earnings are calculated automatically with a full audit trail. No more awkward conversations about what you're owed.",
              },
              {
                icon: "📋",
                title: "Client notes on demand",
                accent: "text-sky-400",
                border: "border-sky-500/20 bg-sky-500/5",
                body: "Keep notes on clients' preferences, injuries, and progress. Pull them up before a private session so every client feels like your only client.",
              },
              {
                icon: "📈",
                title: "Your performance metrics",
                accent: "text-amber-400",
                border: "border-amber-500/20 bg-amber-500/5",
                body: "Track your own fill rates, total sessions taught, and monthly earnings trends. Know exactly how you're doing without asking anyone.",
              },
              {
                icon: "⚡",
                title: "Zero admin overhead",
                accent: "text-indigo-400",
                border: "border-indigo-500/20 bg-indigo-500/5",
                body: "Bookings happen on their own. Payments are collected automatically. Your waitlists fill themselves. You just show up and teach.",
              },
            ].map(({ icon, title, accent, border, body }) => (
              <div key={title} className={`rounded-2xl border ${border} p-6`}>
                <div className="text-3xl mb-4">{icon}</div>
                <div className={`text-sm font-bold ${accent} mb-2`}>
                  {title}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="mx-auto max-w-4xl px-4 py-8 pb-24">
          <div className="grid gap-5 md:grid-cols-2">
            {[
              {
                quote:
                  "As an instructor, I finally trust my payout numbers. I can see exactly which sessions I taught, what I earned, and when it'll hit my account.",
                name: "Marcus Webb",
                role: "Instructor, The Pilates Room · Brooklyn, NY",
                avatar: "MW",
                gradient: "from-emerald-500 to-teal-600",
              },
              {
                quote:
                  "My schedule used to live in four different group chats. Now I open StudioFlow and I know exactly what I'm teaching, when, and how full each class is.",
                name: "Anika R.",
                role: "Lead Instructor, Form & Flow · Nashville, TN",
                avatar: "AR",
                gradient: "from-violet-500 to-fuchsia-600",
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
              Teach more. Worry less.
            </h2>
            <p className="mt-3 text-slate-400 max-w-sm mx-auto">
              Join studios already using StudioFlow to give their instructors
              the clarity they deserve.
            </p>
            <Link
              to="/signup"
              className="mt-6 inline-flex items-center rounded-xl bg-violet-500 px-8 py-3.5 text-sm font-bold text-white hover:bg-violet-400 transition"
            >
              Get started →
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
            <Link to="/for-owners" className="hover:text-slate-400 transition">
              For Owners
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
