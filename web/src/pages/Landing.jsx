import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="absolute -bottom-24 left-10 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/15 blur-3xl" />
          <div className="absolute -bottom-24 right-10 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <header className="sticky top-0 z-30 mx-auto flex w-full max-w-6xl items-center justify-between border-b border-slate-800 bg-slate-950/70 px-4 py-4 backdrop-blur">
          <Link to="/" className="text-xs font-semibold tracking-[0.3em] uppercase text-sky-400/80">
            Studio<strong className="text-slate-300">Flow</strong>
          </Link>
          <nav className="hidden items-center gap-6 text-xs font-medium text-slate-300 md:flex" aria-label="Primary">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#roles" className="hover:text-white">For teams</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex items-center rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-800"
            >
              Open dashboard
            </Link>
            <Link to="/signin" className="text-xs font-medium text-slate-200 hover:text-white">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-on-accent hover:bg-sky-400 transition"
            >
              Get started
            </Link>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-10 md:pt-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Schedule → bookings → payments, in one flow
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-50 md:text-5xl">
                A modern Pilates studio OS your team will actually enjoy using.
              </h1>
              <p className="mt-4 max-w-xl text-sm text-slate-300">
                StudioFlow helps studios sell more sessions with less admin: fast booking, clear calendars, client-friendly checkouts,
                and owner-grade reporting — without the chaos.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/signup/owner"
                  className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-sky-400"
                >
                  Start as a studio owner
                </Link>
                <Link
                  to="/signup/client"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800"
                >
                  I’m a client
                </Link>
              </div>

              <div className="mt-7 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Bookings</div>
                  <div className="mt-1 font-medium">Less back-and-forth</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Payments</div>
                  <div className="mt-1 font-medium">Cards on file</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Payouts</div>
                  <div className="mt-1 font-medium">Clear instructor splits</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-sky-500/20 via-fuchsia-500/10 to-emerald-500/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Live studio view</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    All systems ready
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-100">Today’s schedule</div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">2 locations</div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-200">Reformer — 8:00 AM</div>
                          <div className="text-[11px] text-slate-400">6/8 booked • waitlist enabled</div>
                        </div>
                        <div className="rounded-full bg-sky-500/20 px-2 py-1 text-[11px] font-semibold text-sky-200">Open</div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-200">Tower — 12:30 PM</div>
                          <div className="text-[11px] text-slate-400">8/8 booked • cards on file</div>
                        </div>
                        <div className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-200">Full</div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-200">Private — 6:15 PM</div>
                          <div className="text-[11px] text-slate-400">1/1 booked • payout tracked</div>
                        </div>
                        <div className="rounded-full bg-fuchsia-500/20 px-2 py-1 text-[11px] font-semibold text-fuchsia-200">Booked</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Payments</div>
                      <div className="mt-2 text-sm text-slate-200">Saved methods + fast checkout</div>
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                        Stripe-powered flows
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Payouts</div>
                      <div className="mt-2 text-sm text-slate-200">Instructor splits you can trust</div>
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Owner-grade audit trail
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section id="features" className="mt-16 scroll-mt-24">
            <div className="flex items-end justify-between gap-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Features</div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-50">Everything you need to run the floor.</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300">
                  Built for studios that care about client experience and operational clarity.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-sm font-semibold text-slate-100">Calendar-first scheduling</div>
                <div className="mt-2 text-sm text-slate-300">Quickly see capacity, attendance, and what’s coming next.</div>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Ops clarity</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-sm font-semibold text-slate-100">Smooth client booking</div>
                <div className="mt-2 text-sm text-slate-300">Clients book from the schedule and keep payment methods ready.</div>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Less admin</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-sm font-semibold text-slate-100">Payments + payouts</div>
                <div className="mt-2 text-sm text-slate-300">Track transactions and instructor payouts without spreadsheets.</div>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Get paid</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-sm font-semibold text-slate-100">Multi-location ready</div>
                <div className="mt-2 text-sm text-slate-300">Run multiple locations with consistent templates and operations.</div>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Scale confidently</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-sm font-semibold text-slate-100">Role-based access</div>
                <div className="mt-2 text-sm text-slate-300">Owners, staff, instructors, and clients each get the right tools.</div>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Right views</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-sm font-semibold text-slate-100">Designed for speed</div>
                <div className="mt-2 text-sm text-slate-300">Clean navigation and focused pages so your team moves fast.</div>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">No clutter</div>
              </div>
            </div>
          </section>

          <section id="roles" className="mt-16 scroll-mt-24">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">For teams</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">Built for owners, staff, instructors, and clients.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">Owners</div>
                <div className="mt-2 text-sm font-semibold text-slate-100">Know what’s happening — and what’s paying.</div>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li className="flex gap-2"><span className="text-emerald-400">✓</span><span>Locations, templates, and policies in one place</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400">✓</span><span>Bookings visibility across the calendar</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400">✓</span><span>Instructor payouts with fewer disputes</span></li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-300">Staff & instructors</div>
                <div className="mt-2 text-sm font-semibold text-slate-100">Stay in flow during busy hours.</div>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li className="flex gap-2"><span className="text-emerald-400">✓</span><span>Quickly find sessions and bookings</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400">✓</span><span>See client details and status at a glance</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400">✓</span><span>Fewer tabs, fewer mistakes</span></li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Clients</div>
                <div className="mt-2 text-sm font-semibold text-slate-100">Book, pay, and come in relaxed.</div>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li className="flex gap-2"><span className="text-emerald-400">✓</span><span>Easy schedule browsing</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400">✓</span><span>Saved payment methods</span></li>
                  <li className="flex gap-2"><span className="text-emerald-400">✓</span><span>Favorites for faster re-booking</span></li>
                </ul>
              </div>
            </div>
          </section>

          <section id="faq" className="mt-16 scroll-mt-24">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">FAQ</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">Questions, answered.</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-sm font-semibold text-slate-100">Do I need an account to explore?</div>
                <div className="mt-2 text-sm text-slate-300">No — this page is public. When you’re ready, create an owner or client account.</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-sm font-semibold text-slate-100">Can clients book and store cards?</div>
                <div className="mt-2 text-sm text-slate-300">Yes. Clients can book from the schedule and manage saved payment methods for faster checkout.</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-sm font-semibold text-slate-100">Does it support multiple locations?</div>
                <div className="mt-2 text-sm text-slate-300">Yes — locations can be managed and selected directly in the dashboard.</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="text-sm font-semibold text-slate-100">Where do I start?</div>
                <div className="mt-2 text-sm text-slate-300">If you run a studio, start with an owner account. If you attend classes, start as a client.</div>
              </div>
            </div>
          </section>

          <section className="mt-16">
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-950/60 p-7 md:p-10">
              <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Ready?</div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-50">Turn scheduling into sales — not stress.</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">Create an account and start organizing sessions, bookings, and payments in minutes.</p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <Link
                    to="/signup/owner"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-sky-400 sm:w-auto"
                  >
                    Start as owner
                  </Link>
                  <Link
                    to="/signin"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 sm:w-auto"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-14 flex flex-col gap-4 border-t border-slate-800 py-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <div>© {new Date().getFullYear()} StudioFlow</div>
            <div className="flex items-center gap-4">
              <a href="#features" className="hover:text-slate-300">Features</a>
              <a href="#roles" className="hover:text-slate-300">For teams</a>
              <a href="#faq" className="hover:text-slate-300">FAQ</a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
