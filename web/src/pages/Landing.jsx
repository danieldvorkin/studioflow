import { useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/* ─── Mini in-app mockup components ─────────────────────────── */

function SessionRow({ time, name, spots, total, badge, badgeColor }) {
  const pct = Math.round((spots / total) * 100);
  const barColor =
    pct >= 100 ? "bg-emerald-400" : pct >= 75 ? "bg-sky-400" : "bg-slate-600";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5">
      <div className="w-16 shrink-0 text-[11px] font-semibold text-slate-400">
        {time}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-100">
          {name}
        </div>
        <div className="mt-1 h-1 w-full rounded-full bg-slate-800">
          <div
            className={`h-1 rounded-full ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
      <div
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}
      >
        {badge}
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl">
      {/* Fake browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 bg-slate-950/60 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <div className="mx-auto flex w-48 items-center justify-center rounded bg-slate-800/60 px-3 py-0.5 text-[10px] text-slate-500">
          app.studioflow.app
        </div>
      </div>
      {/* Sidebar + content */}
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-44 shrink-0 border-r border-slate-800 bg-slate-950/50 px-3 py-4 md:block">
          <div className="mb-4 text-[10px] font-bold tracking-[0.3em] uppercase text-sky-400/80">
            StudioFlow
          </div>
          {[
            "Dashboard",
            "Schedule",
            "Bookings",
            "Clients",
            "Analytics",
            "Payouts",
          ].map((item, i) => (
            <div
              key={item}
              className={`mb-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${i === 1 ? "bg-sky-500/20 text-sky-300" : "text-slate-400"}`}
            >
              {item}
            </div>
          ))}
        </div>
        {/* Main area */}
        <div className="flex-1 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-100">
              Today · Mon Mar 3
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 2
              locations live
            </div>
          </div>
          <div className="space-y-2">
            <SessionRow
              time="7:00 AM"
              name="Reformer Flow"
              spots={8}
              total={8}
              badge="FULL"
              badgeColor="bg-emerald-500/20 text-emerald-300"
            />
            <SessionRow
              time="9:30 AM"
              name="Tower Strength"
              spots={5}
              total={8}
              badge="OPEN"
              badgeColor="bg-sky-500/20 text-sky-300"
            />
            <SessionRow
              time="12:00 PM"
              name="Mat Pilates"
              spots={7}
              total={10}
              badge="OPEN"
              badgeColor="bg-sky-500/20 text-sky-300"
            />
            <SessionRow
              time="4:00 PM"
              name="Private — Sarah T."
              spots={1}
              total={1}
              badge="VIP"
              badgeColor="bg-fuchsia-500/20 text-fuchsia-300"
            />
            <SessionRow
              time="6:30 PM"
              name="Evening Reformer"
              spots={3}
              total={8}
              badge="OPEN"
              badgeColor="bg-sky-500/20 text-sky-300"
            />
          </div>
          {/* Mini stats bar */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["24", "bookings today"],
              ["$1,840", "revenue"],
              ["92%", "fill rate"],
            ].map(([val, label]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 text-center"
              >
                <div className="text-base font-bold text-slate-50">{val}</div>
                <div className="text-[10px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl">
      <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3">
        <div className="text-xs font-semibold text-slate-400">
          Client booking flow
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
          <div className="text-sm font-semibold text-slate-100">
            Reformer Flow · Thursday 9:00 AM
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Instructor: Maria L. · Studio Soho
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-slate-800">
              <div className="h-1.5 w-[70%] rounded-full bg-sky-400" />
            </div>
            <span className="text-[10px] font-semibold text-sky-400">
              5/8 spots
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Payment
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-11 items-center justify-center rounded bg-gradient-to-br from-blue-700 to-indigo-800 text-[10px] font-bold text-white">
                VISA
              </div>
              <span className="text-sm text-slate-200">•••• 4242</span>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              Default
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Session fee</span>
          <span className="font-semibold text-slate-100">$55.00</span>
        </div>
        <button className="w-full rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-sky-400 transition">
          Confirm booking
        </button>
      </div>
    </div>
  );
}

function PayoutMockup() {
  const rows = [
    {
      name: "Maria L.",
      sessions: 14,
      amount: "$1,120",
      status: "Paid",
      color: "text-emerald-400 bg-emerald-500/10",
    },
    {
      name: "James K.",
      sessions: 9,
      amount: "$720",
      status: "Pending",
      color: "text-sky-400 bg-sky-500/10",
    },
    {
      name: "Anika R.",
      sessions: 11,
      amount: "$880",
      status: "Paid",
      color: "text-emerald-400 bg-emerald-500/10",
    },
    {
      name: "Chris M.",
      sessions: 6,
      amount: "$480",
      status: "Review",
      color: "text-amber-400 bg-amber-500/10",
    },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl">
      <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-400">
          Instructor payouts · March
        </div>
        <div className="text-xs font-semibold text-sky-400">$3,200 total</div>
      </div>
      <div className="p-4 space-y-2">
        {rows.map((r) => (
          <div
            key={r.name}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-[11px] font-bold text-slate-300">
                {r.name[0]}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-100">
                  {r.name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {r.sessions} sessions
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-200">
                {r.amount}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.color}`}
              >
                {r.status}
              </span>
            </div>
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/20 px-4 py-2.5">
          <span className="text-xs text-slate-500">
            No spreadsheets. No disputes.
          </span>
          <span className="text-[10px] font-semibold text-sky-400">
            Export CSV →
          </span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsMockup() {
  const bars = [65, 80, 55, 90, 75, 95, 70];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const barColors = [
    "from-sky-500 to-sky-400",
    "from-indigo-500 to-sky-500",
    "from-violet-500 to-indigo-500",
    "from-sky-400 to-cyan-400",
    "from-indigo-400 to-sky-400",
    "from-violet-400 to-fuchsia-400",
    "from-sky-500 to-indigo-400",
  ];
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
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl">
      <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3">
        <div className="text-xs font-semibold text-slate-400">
          Studio analytics
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            ["$12.4k", "Revenue MTD", "text-emerald-400"],
            ["89%", "Fill rate", "text-sky-400"],
            ["4.9★", "Satisfaction", "text-amber-400"],
          ].map(([v, l, c]) => (
            <div
              key={l}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center"
            >
              <div className={`text-lg font-bold ${c}`}>{v}</div>
              <div className="text-[10px] text-slate-500">{l}</div>
            </div>
          ))}
        </div>
        <div ref={ref}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Bookings this week
          </div>
          <div className="flex h-20 items-end gap-1.5">
            {bars.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm bg-gradient-to-t ${barColors[i]} shadow-sm`}
                  style={{
                    height: animated ? `${h}%` : "0%",
                    transition: `height 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 80}ms`,
                  }}
                />
                <span className="text-[9px] text-slate-600">{days[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Top class: Reformer Flow
          </span>
          <span className="text-[10px] font-bold text-emerald-400">
            ↑ 22% MoM
          </span>
        </div>
      </div>
    </div>
  );
}

function ShopMockup() {
  const items = [
    {
      name: "Reformer Grip Socks",
      price: "$18",
      tag: "Best seller",
      tagColor: "bg-amber-500/20 text-amber-300",
      img: "🧦",
    },
    {
      name: "Studio Tote Bag",
      price: "$34",
      tag: "New",
      tagColor: "bg-sky-500/20 text-sky-300",
      img: "👜",
    },
    {
      name: "Resistance Loop Set",
      price: "$24",
      tag: "Popular",
      tagColor: "bg-violet-500/20 text-violet-300",
      img: "⭕",
    },
    {
      name: "Cork Yoga Block",
      price: "$22",
      tag: "Eco",
      tagColor: "bg-emerald-500/20 text-emerald-300",
      img: "🟫",
    },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl">
      <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-400">Studio shop</div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-slate-500">4 items · March</div>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-300">
            2
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {items.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 flex flex-col gap-1.5"
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{item.img}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${item.tagColor}`}
                >
                  {item.tag}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-100 leading-tight">
                {item.name}
              </div>
              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="text-sm font-bold text-slate-200">
                  {item.price}
                </span>
                <button className="rounded-lg bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                  + Add
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2.5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Month revenue
            </div>
            <div className="text-[10px] text-slate-500">
              98 orders · 0 spreadsheets
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-emerald-400">$3,412</div>
            <div className="text-[10px] font-semibold text-emerald-500/60">
              ↑ 31% MoM
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientPortalMockup() {
  const classes = [
    {
      name: "Reformer Flow",
      day: "Thu",
      time: "9:00 AM",
      spots: "3 left",
      fav: true,
    },
    {
      name: "Tower Strength",
      day: "Fri",
      time: "7:30 AM",
      spots: "5 left",
      fav: false,
    },
    {
      name: "Mat Pilates",
      day: "Sat",
      time: "10:00 AM",
      spots: "Waitlist",
      fav: true,
    },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl">
      <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-400">
          Client portal
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500" />
          Sarah T.
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Upcoming classes
        </div>
        {classes.map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  {c.day}
                </div>
                <div className="text-xs font-semibold text-slate-300">
                  {c.time}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-100">
                  {c.name}
                </div>
                <div className="text-[10px] text-slate-500">{c.spots}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {c.fav && <span className="text-fuchsia-400 text-xs">♥</span>}
              <button className="rounded-lg bg-sky-500/20 px-2.5 py-1 text-[10px] font-bold text-sky-300">
                Book
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Contact section ─────────────────────────────────────────── */
function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("server error");
      setStatus("sent");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="contact" className="mx-auto mt-28 max-w-2xl scroll-mt-20 px-4">
      <div className="text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400">
          Get in touch
        </div>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
          Have a question? We&apos;d love to hear from you.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-400">
          Send us a message and we&apos;ll get back to you as soon as possible.
        </p>
      </div>

      {status === "sent" ? (
        <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <div className="text-2xl font-bold text-emerald-400">
            Message sent ✓
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Thanks for reaching out — we&apos;ll be in touch soon.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Message
            </label>
            <textarea
              name="message"
              required
              rows={5}
              value={form.message}
              onChange={handleChange}
              placeholder="How can we help?"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40 resize-none"
            />
          </div>

          {status === "error" && (
            <p className="text-sm text-rose-400">
              Something went wrong — please try again.
            </p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl bg-sky-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Send message →"}
          </button>
        </form>
      )}
    </section>
  );
}

export default function Landing() {
  useDocumentTitle(null);
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      {/* ── Ambient background glows ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute top-[60vh] -left-20 h-[36rem] w-[36rem] rounded-full bg-violet-600/8 blur-3xl" />
        <div className="absolute top-[40vh] right-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/8 blur-3xl" />
      </div>

      {/* ── NAV ── */}
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-[0.28em] uppercase">
              <span className="text-sky-400">Studio</span>
              <span className="text-slate-200">Flow</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-xs font-medium text-slate-400 md:flex">
            <a href="#product" className="transition hover:text-white">
              Product
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#roles" className="transition hover:text-white">
              Who it's for
            </a>
            <Link to="/team" className="transition hover:text-white">
              Team
            </Link>
            <Link to="/contact" className="transition hover:text-white">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link
              to="/signin"
              className="text-xs font-medium text-slate-400 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-sky-400"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        {/* ══════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-6xl px-4 pb-8 pt-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Schedule · Book · Pay · Payout — done.
          </div>

          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight text-white md:text-7xl leading-[1.05]">
            Studio management{" "}
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              at your fingertips.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-slate-400">
            Everything your studio needs to run — bookings, payments, client
            management, and instructor payouts — in one beautiful flow.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup/owner"
              className="inline-flex items-center rounded-xl bg-sky-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
            >
              Start your studio free →
            </Link>
            <Link
              to="/signin"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              Sign in
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-slate-800 bg-slate-800">
            {[
              ["92%", "Average fill rate"],
              ["< 30s", "Client booking time"],
              ["Zero", "Spreadsheets needed"],
            ].map(([stat, label]) => (
              <div key={label} className="bg-slate-900/80 px-6 py-5">
                <div className="text-2xl font-bold text-white">{stat}</div>
                <div className="mt-1 text-[11px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Hero dashboard mockup — full-width ── */}
        <section
          id="product"
          className="mx-auto mt-6 max-w-5xl scroll-mt-20 px-4 pb-6"
        >
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-sky-500/20 via-violet-500/10 to-fuchsia-500/10 blur-2xl" />
            <div className="relative">
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            FEATURE SPOTLIGHTS  (alternating layout)
        ══════════════════════════════════════════════════ */}
        <section
          id="features"
          className="mx-auto mt-24 max-w-6xl scroll-mt-20 space-y-28 px-4"
        >
          {/* 1 — Booking */}
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400">
                Booking
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Clients book in seconds.
                <br />
                <span className="text-slate-400 font-normal">
                  No back-and-forth.
                </span>
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {[
                  "Browse the schedule and book with one tap",
                  "Saved cards mean checkout takes under 30 seconds",
                  "Automatic confirmations, no manual follow-up",
                  "Waitlists managed for you when sessions fill",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-400 text-xs">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-sky-500/10 blur-2xl" />
              <div className="relative">
                <BookingMockup />
              </div>
            </div>
          </div>

          {/* 2 — Payouts */}
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="order-2 md:order-1 relative">
              <div className="absolute -inset-4 rounded-3xl bg-violet-500/10 blur-2xl" />
              <div className="relative">
                <PayoutMockup />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-violet-400">
                Payouts
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Instructor pay, done right.
                <br />
                <span className="text-slate-400 font-normal">
                  No disputes. No spreadsheets.
                </span>
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {[
                  "Automatic per-session earnings calculation",
                  "Full audit trail owners can actually trust",
                  "Export to CSV in one click for accounting",
                  "Pending, paid, and review statuses at a glance",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-400 text-xs">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 3 — Analytics */}
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-400">
                Analytics
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Know your studio cold.
                <br />
                <span className="text-slate-400 font-normal">
                  Without the guesswork.
                </span>
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {[
                  "Revenue, fill rate, and bookings in one view",
                  "Week-over-week trends for every class type",
                  "Top-performing sessions surfaced automatically",
                  "Multi-location breakdowns for growing studios",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 text-xs">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-emerald-500/10 blur-2xl" />
              <div className="relative">
                <AnalyticsMockup />
              </div>
            </div>
          </div>

          {/* 4 — Client portal */}
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="order-2 md:order-1 relative">
              <div className="absolute -inset-4 rounded-3xl bg-fuchsia-500/10 blur-2xl" />
              <div className="relative">
                <ClientPortalMockup />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-fuchsia-400">
                Client portal
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Clients love their experience.
                <br />
                <span className="text-slate-400 font-normal">
                  They keep coming back.
                </span>
              </h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {[
                  "Self-service booking from any device",
                  "Favorites for instant re-booking of loved classes",
                  "Saved payment methods, always ready",
                  "Zero friction from browse to confirmation",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-fuchsia-400 text-xs">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 5 — Shop */}
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-400">
                Studio Shop
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Sell more than sessions.
                <br />
                <span className="text-slate-400 font-normal">
                  Your merch, in your flow.
                </span>
              </h2>
              <p className="mt-4 text-sm text-slate-400">
                Add a shop directly inside your studio platform. Sell grip
                socks, resistance bands, logo totes — whatever your clients
                love. Orders land right in your dashboard, revenue stacks up
                automatically.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                {[
                  "List products in minutes — no third-party store needed",
                  "Clients shop between bookings without leaving the app",
                  "Inventory tracked automatically, orders fulfilled with ease",
                  "Monthly shop revenue rolls up alongside session revenue",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 text-xs">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-amber-500/10 blur-2xl" />
              <div className="relative">
                <ShopMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            FEATURE GRID (quick-scan cards)
        ══════════════════════════════════════════════════ */}
        <section className="mx-auto mt-28 max-w-6xl px-4">
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400">
              Everything included
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              The full stack, without the complexity.
            </h2>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                emoji: "📅",
                title: "Calendar scheduling",
                desc: "Drag, create, and manage sessions with full capacity visibility.",
              },
              {
                emoji: "💳",
                title: "Cards on file",
                desc: "Stripe-powered. Clients save once, pay instantly every time.",
              },
              {
                emoji: "📍",
                title: "Multi-location",
                desc: "Manage every location from one dashboard, no switching required.",
              },
              {
                emoji: "🔐",
                title: "Role-based access",
                desc: "Owners, staff, instructors, and clients each see exactly what they need.",
              },
              {
                emoji: "📦",
                title: "Bundles & memberships",
                desc: "Sell class packs and recurring memberships that auto-track usage.",
              },
              {
                emoji: "📊",
                title: "Owner analytics",
                desc: "Revenue, fill rates, and trends — always current, never stale.",
              },
              {
                emoji: "✉️",
                title: "Email notifications",
                desc: "Booking confirmations and reminders sent automatically.",
              },
              {
                emoji: "⭐",
                title: "Favorites",
                desc: "Clients star their go-to classes for one-tap rebooking.",
              },
              {
                emoji: "⚡",
                title: "Fast by design",
                desc: "Clean navigation. No bloat. Your team actually enjoys using it.",
              },
              {
                emoji: "🛍️",
                title: "Built-in shop",
                desc: "Sell merch and accessories directly to clients — no third-party store needed.",
              },
            ].map(({ emoji, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="text-2xl">{emoji}</div>
                <div className="mt-3 font-semibold text-slate-100">{title}</div>
                <div className="mt-1.5 text-sm text-slate-400">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            WHO IT'S FOR
        ══════════════════════════════════════════════════ */}
        <section
          id="roles"
          className="mx-auto mt-28 max-w-6xl scroll-mt-20 px-4"
        >
          <div className="text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400">
              Who it's for
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Built for every role in your studio.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                role: "Studio Owners",
                color: "text-sky-400",
                border: "border-sky-500/20",
                bg: "bg-sky-500/5",
                tagline: "Run your business,\nnot your inbox.",
                link: "/for-owners",
                perks: [
                  "Full revenue and booking visibility",
                  "Instructor payouts with zero disputes",
                  "Multi-location control in one view",
                  "Membership and bundle management",
                ],
              },
              {
                role: "Instructors & Staff",
                color: "text-violet-400",
                border: "border-violet-500/20",
                bg: "bg-violet-500/5",
                tagline: "Stay in flow,\nnot in admin.",
                link: "/for-instructors",
                perks: [
                  "See your schedule at a glance",
                  "Track client attendance effortlessly",
                  "Payout history you can trust",
                  "Client notes and history on demand",
                ],
              },
              {
                role: "Clients",
                color: "text-emerald-400",
                border: "border-emerald-500/20",
                bg: "bg-emerald-500/5",
                tagline: "Book, pay, show up.\nThat's it.",
                link: "/for-clients",
                perks: [
                  "Browse and book from any device",
                  "Saved cards for instant checkout",
                  "Favorite classes for fast rebooking",
                  "Booking history always accessible",
                ],
              },
            ].map(({ role, color, border, bg, tagline, perks, link }) => (
              <Link
                key={role}
                to={link}
                className={`group rounded-2xl border ${border} ${bg} p-6 block transition hover:brightness-110`}
              >
                <div
                  className={`text-[11px] font-bold uppercase tracking-[0.22em] ${color}`}
                >
                  {role}
                </div>
                <div className="mt-3 text-lg font-bold text-white whitespace-pre-line">
                  {tagline}
                </div>
                <ul className="mt-5 space-y-2.5">
                  {perks.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2.5 text-sm text-slate-300"
                    >
                      <span className={`mt-0.5 shrink-0 font-bold ${color}`}>
                        ✓
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <div
                  className={`mt-5 text-xs font-semibold ${color} opacity-0 group-hover:opacity-100 transition`}
                >
                  See how it works →
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            THE OLD WAY VS STUDIOFLOW  (X-factor section)
        ══════════════════════════════════════════════════ */}
        <section className="mx-auto mt-28 max-w-6xl px-4">
          <div className="text-center mb-12">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-rose-400">
              The honest truth
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Your current setup is{" "}
              <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
                costing you.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Every session managed in a spreadsheet, every booking chased over
              text, every payout argued over — that's hours you're not getting
              back. And clients who don't come back.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Before */}
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-sm font-bold text-rose-400">
                  ✕
                </div>
                <div className="text-sm font-bold text-rose-400 uppercase tracking-widest">
                  The old way
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  ["Google Sheets", 'your "booking system"'],
                  ["Instagram DMs", "for class reservations"],
                  ["Venmo / cash", "chased for every session"],
                  ["Email threads", "to manage instructor pay"],
                  ["3 different apps", "none of them talk to each other"],
                  ["Zero visibility", "into revenue until end of month"],
                  ["Clients forget", "because there's no reminder system"],
                  ["Waitlists", "managed manually, in your head"],
                ].map(([bold, rest]) => (
                  <li
                    key={bold}
                    className="flex items-start gap-3 text-sm text-slate-400"
                  >
                    <span className="mt-0.5 shrink-0 text-rose-500/60">—</span>
                    <span>
                      <span className="font-semibold text-rose-300/80">
                        {bold}
                      </span>{" "}
                      {rest}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <span className="font-bold">Result:</span> You're running a
                studio part-time and doing office admin full-time.
              </div>
            </div>

            {/* After */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-400">
                  ✓
                </div>
                <div className="text-sm font-bold text-emerald-400 uppercase tracking-widest">
                  With StudioFlow
                </div>
              </div>
              <ul className="space-y-3">
                {[
                  ["One dashboard", "schedules, bookings, clients, payouts"],
                  ["Client portal", "clients book themselves, 24/7"],
                  [
                    "Stripe on file",
                    "payment collected automatically at booking",
                  ],
                  ["Payout reports", "generated in seconds, no disputes"],
                  [
                    "Everything connected",
                    "schedule → booking → payment → payout",
                  ],
                  ["Live revenue", "always current, never a surprise"],
                  ["Auto-reminders", "sent so clients actually show up"],
                  ["Waitlists handled", "automatically when a spot opens"],
                ].map(([bold, rest]) => (
                  <li
                    key={bold}
                    className="flex items-start gap-3 text-sm text-slate-300"
                  >
                    <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                    <span>
                      <span className="font-semibold text-emerald-300">
                        {bold}
                      </span>{" "}
                      {rest}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <span className="font-bold">Result:</span> You teach. StudioFlow
                handles the rest.
              </div>
            </div>
          </div>

          {/* Social proof numbers */}
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["4.2 hrs", "saved per week on admin, on average"],
              ["31%", "average revenue increase in 90 days"],
              ["< 30 sec", "average client booking time"],
              ["98%", "of studios say they'd never go back"],
            ].map(([stat, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center"
              >
                <div className="text-2xl font-bold text-white">{stat}</div>
                <div className="mt-1.5 text-[11px] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            CONTACT
        ══════════════════════════════════════════════════ */}
        <ContactSection />

        {/* ══════════════════════════════════════════════════
            FINAL CTA
        ══════════════════════════════════════════════════ */}
        <section className="mx-auto mt-28 max-w-6xl px-4 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-10 text-center md:p-16">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-500/15 blur-3xl" />
              <div className="absolute bottom-0 left-10 h-48 w-48 rounded-full bg-violet-500/10 blur-2xl" />
              <div className="absolute bottom-0 right-10 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-2xl" />
            </div>
            <div className="relative">
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400">
                Get started
              </div>
              <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-bold tracking-tight text-white md:text-5xl">
                Your studio deserves better tools.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-slate-400">
                Set up in minutes. No contract, no complexity. Just a studio
                that runs smoother from day one.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/signup/owner"
                  className="inline-flex items-center rounded-xl bg-sky-500 px-8 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
                >
                  Start as a studio owner →
                </Link>
                <Link
                  to="/signup/client"
                  className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/60 px-8 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  I'm a client
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-800/60 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-600 md:flex-row">
            <div className="font-bold tracking-widest uppercase">
              <span className="text-sky-500/60">Studio</span>Flow
            </div>
            <div className="flex items-center gap-6">
              <a href="#product" className="transition hover:text-slate-400">
                Product
              </a>
              <a href="#features" className="transition hover:text-slate-400">
                Features
              </a>
              <a href="#roles" className="transition hover:text-slate-400">
                Who it's for
              </a>
              <a href="#contact" className="transition hover:text-slate-400">
                Contact
              </a>
              <Link to="/signin" className="transition hover:text-slate-400">
                Sign in
              </Link>
            </div>
            <div>© {new Date().getFullYear()} StudioFlow</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
