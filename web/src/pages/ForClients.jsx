import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useEffect, useRef, useState } from "react";

function ClientBookingMockup() {
  const [step, setStep] = useState(0);
  const steps = ["Browse", "Select", "Confirm"];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl">
      <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-300">
          Client booking flow
        </div>
        <div className="flex items-center gap-1">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${step === i ? "bg-emerald-500/20 text-emerald-300" : "text-slate-500 hover:text-slate-300"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {step === 0 && (
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
              This week's schedule
            </div>
            {[
              {
                time: "Mon 7:00 AM",
                name: "Reformer Flow",
                spots: "2 spots left",
                badge: "Hot",
                bc: "bg-rose-500/20 text-rose-300",
              },
              {
                time: "Wed 9:30 AM",
                name: "Tower Strength",
                spots: "5 spots left",
                badge: "Open",
                bc: "bg-sky-500/20 text-sky-300",
              },
              {
                time: "Thu 9:00 AM",
                name: "Mat Pilates",
                spots: "Waitlist",
                badge: "Full",
                bc: "bg-slate-700 text-slate-400",
              },
              {
                time: "Fri 7:30 AM",
                name: "Evening Reformer",
                spots: "6 spots left",
                badge: "Open",
                bc: "bg-sky-500/20 text-sky-300",
              },
            ].map((c, i) => (
              <button
                key={i}
                onClick={() => setStep(1)}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-left hover:border-emerald-500/40 transition"
              >
                <div className="w-20 shrink-0 text-[10px] text-slate-400 font-semibold">
                  {c.time}
                </div>
                <div className="flex-1 text-sm font-medium text-slate-100">
                  {c.name}
                </div>
                <div className="text-[10px] text-slate-500">{c.spots}</div>
                <div
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.bc}`}
                >
                  {c.badge}
                </div>
              </button>
            ))}
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4">
              <div className="text-sm font-semibold text-slate-100">
                Reformer Flow · Monday 7:00 AM
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Instructor: Maria L. · Studio Soho
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-slate-800">
                  <div
                    className="h-1.5 w-[75%] rounded-full bg-gradient-to-r from-sky-500 to-indigo-400"
                    style={{ transition: "width 0.8s ease" }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-sky-400">
                  6/8 spots
                </span>
              </div>
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
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Session fee</span>
              <span className="font-semibold text-slate-100">$55.00</span>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              Confirm booking →
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="text-center py-6 space-y-3">
            <div className="text-4xl">✅</div>
            <div className="text-lg font-bold text-emerald-400">You're in!</div>
            <div className="text-sm text-slate-300 font-semibold">
              Reformer Flow · Monday 7:00 AM
            </div>
            <div className="text-[11px] text-slate-500">
              Confirmation sent to sarah@email.com
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 mt-4">
              <div className="text-xs text-slate-400">
                Total charged to •••• 4242
              </div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                $55.00
              </div>
            </div>
            <button
              onClick={() => setStep(0)}
              className="mt-2 text-xs text-sky-400 hover:text-sky-300 transition"
            >
              ← Browse more classes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FavoritesMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/80 shadow-2xl">
      <div className="border-b border-slate-800 bg-slate-950/60 px-5 py-3">
        <div className="text-xs font-semibold text-slate-300">
          My saved classes ♥
        </div>
      </div>
      <div className="p-4 space-y-2">
        {[
          {
            name: "Reformer Flow",
            day: "Mondays 7:00 AM",
            spots: "2 left",
            next: "Mar 9",
          },
          {
            name: "Mat Pilates",
            day: "Thursdays 9:00 AM",
            spots: "5 left",
            next: "Mar 12",
          },
          {
            name: "Tower Strength",
            day: "Fridays 7:30 AM",
            spots: "Open",
            next: "Mar 13",
          },
        ].map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-fuchsia-400 text-sm">♥</span>
              <div>
                <div className="text-sm font-medium text-slate-100">
                  {c.name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {c.day} · Next: {c.next}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">{c.spots}</span>
              <button className="rounded-lg bg-fuchsia-500/20 px-2.5 py-1 text-[10px] font-bold text-fuchsia-300">
                Book
              </button>
            </div>
          </div>
        ))}
        <div className="text-center text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-800">
          Tap ♥ on any class to save it here for instant rebooking
        </div>
      </div>
    </div>
  );
}

export default function ForClients() {
  useDocumentTitle("For Clients — StudioFlow");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-[60vh] right-0 h-[36rem] w-[36rem] rounded-full bg-sky-600/8 blur-3xl" />
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
            <Link to="/for-instructors" className="hover:text-white transition">
              For Instructors
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
              to="/signup/client"
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              Join free
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-6">
            For Clients
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-white md:text-6xl leading-[1.05]">
            Book, pay, show up.{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 bg-clip-text text-transparent">
              That's it.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-slate-400">
            No apps to juggle, no texts to send, no waiting for a confirmation.
            StudioFlow gives you a clean, fast, beautiful way to book the
            classes you love.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup/client"
              className="inline-flex items-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              Join free →
            </Link>
            <Link
              to="/signin"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
            >
              Sign in
            </Link>
          </div>
        </section>

        {/* Interactive mockup */}
        <section className="mx-auto max-w-5xl px-4 pb-16 grid gap-8 md:grid-cols-2">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-emerald-500/10 blur-2xl" />
            <div className="relative">
              <ClientBookingMockup />
              <p className="text-center text-[11px] text-slate-500 mt-3">
                ↑ Interactive — click through the booking flow
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-fuchsia-500/10 blur-2xl" />
            <div className="relative">
              <FavoritesMockup />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Built around how you actually use it.
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "⚡",
                title: "Book in under 30 seconds",
                accent: "text-sky-400",
                border: "border-sky-500/20 bg-sky-500/5",
                body: "Browse, pick your class, tap confirm. Your card on file handles the rest. No forms, no emails, no waiting for approval.",
              },
              {
                icon: "♥",
                title: "Favorite classes",
                accent: "text-fuchsia-400",
                border: "border-fuchsia-500/20 bg-fuchsia-500/5",
                body: "Tap the heart on any class to save it. Your favorites are always front and center so rebooking your go-to session takes one tap.",
              },
              {
                icon: "💳",
                title: "Save your card once",
                accent: "text-emerald-400",
                border: "border-emerald-500/20 bg-emerald-500/5",
                body: "Powered by Stripe. Add your card once, and every future booking just works. No re-entering details, no friction.",
              },
              {
                icon: "📱",
                title: "Any device, anytime",
                accent: "text-amber-400",
                border: "border-amber-500/20 bg-amber-500/5",
                body: "Book from your phone in the car, your laptop at home, or your tablet on the couch. StudioFlow is fully responsive.",
              },
              {
                icon: "📬",
                title: "Automatic confirmations",
                accent: "text-violet-400",
                border: "border-violet-500/20 bg-violet-500/5",
                body: "You'll get a confirmation the moment you book and a reminder before your class. No need to screenshot or keep mental notes.",
              },
              {
                icon: "⏳",
                title: "Waitlists that work",
                accent: "text-indigo-400",
                border: "border-indigo-500/20 bg-indigo-500/5",
                body: "When a class fills up, join the waitlist. StudioFlow automatically moves you in when a spot opens — no need to keep checking.",
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

        {/* Quote */}
        <section className="mx-auto max-w-3xl px-4 py-8 pb-24">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
            <div className="flex justify-center gap-0.5 mb-5">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-amber-400 text-lg">
                  ★
                </span>
              ))}
            </div>
            <p className="text-lg text-slate-200 leading-relaxed italic">
              &ldquo;My clients constantly compliment how easy booking is. One
              told me she books her Thursday class before she's even out of the
              parking lot.&rdquo;
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center font-bold text-white text-sm">
                SR
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-100">
                  Sofia Reyes
                </div>
                <div className="text-[11px] text-slate-500">
                  Owner, Center Reformer · Miami, FL
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-10 text-center">
            <h2 className="text-3xl font-bold text-white">
              Ready to find your next class?
            </h2>
            <p className="mt-3 text-slate-400 max-w-sm mx-auto">
              Join in minutes. Your studio's already on StudioFlow.
            </p>
            <Link
              to="/signup/client"
              className="mt-6 inline-flex items-center rounded-xl bg-emerald-500 px-8 py-3.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              Join free →
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
            <Link
              to="/for-instructors"
              className="hover:text-slate-400 transition"
            >
              For Instructors
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
