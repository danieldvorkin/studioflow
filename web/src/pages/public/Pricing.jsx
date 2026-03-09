import { Link } from "react-router-dom";
import { useState } from "react";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useCurrency } from "../../currency/CurrencyProvider";

const PLANS = [
  {
    name: "Starter",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyPriceUsd: 0,
    yearlyPriceUsd: 0,
    tagline: "Free forever. Really.",
    accent: "text-slate-300",
    border: "border-slate-700",
    bg: "bg-slate-900/60",
    badgeBg: "",
    badge: "",
    cta: "Get started free",
    ctaTo: "/signup/owner",
    ctaStyle:
      "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800",
    features: [
      "1 location",
      "Up to 50 active clients",
      "Unlimited class sessions",
      "Client self-booking portal",
      "Stripe payment collection",
      "Email booking confirmations",
      "Basic schedule management",
    ],
    missing: [
      "Instructor payout reports",
      "Analytics dashboard",
      "Bundle & membership sales",
      "Multi-location support",
      "Built-in shop",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 59,
    yearlyPrice: 49,
    monthlyPriceUsd: 44,
    yearlyPriceUsd: 36,
    tagline: "For studios ready to grow.",
    accent: "text-sky-300",
    border: "border-sky-500/40",
    bg: "bg-sky-500/5",
    badge: "Most popular",
    badgeBg: "bg-sky-500/20 text-sky-300",
    cta: "Start Pro free for 14 days",
    ctaTo: "/signup/owner",
    ctaStyle:
      "bg-sky-500 text-slate-950 hover:bg-sky-400 shadow-lg shadow-sky-500/20",
    features: [
      "Everything in Starter",
      "Up to 5 locations",
      "Unlimited clients",
      "Instructor payout tracking & reports",
      "Full analytics dashboard",
      "Bundles & membership plans",
      "Waitlist management",
      "CSV exports",
      "Email support",
    ],
    missing: ["Built-in shop", "White-label client portal", "Priority support"],
  },
  {
    name: "Studio",
    monthlyPrice: 129,
    yearlyPrice: 109,
    monthlyPriceUsd: 96,
    yearlyPriceUsd: 81,
    tagline: "For multi-location operations.",
    accent: "text-violet-300",
    border: "border-violet-500/40",
    bg: "bg-violet-500/5",
    badge: "Best value",
    badgeBg: "bg-violet-500/20 text-violet-300",
    cta: "Start Studio free for 14 days",
    ctaTo: "/signup/owner",
    ctaStyle:
      "bg-violet-500 text-white hover:bg-violet-400 shadow-lg shadow-violet-500/20",
    features: [
      "Everything in Pro",
      "Unlimited locations",
      "Built-in studio shop",
      "White-label client portal",
      "Advanced role permissions",
      "Priority Slack support",
      "Dedicated onboarding call",
      "Custom CSV & reporting",
    ],
    missing: [],
  },
];

const COMPARE_ROWS = [
  {
    category: "Core",
    rows: [
      ["Locations", "1", "Up to 5", "Unlimited"],
      ["Active clients", "50", "Unlimited", "Unlimited"],
      ["Class sessions", "✓", "✓", "✓"],
      ["Client booking portal", "✓", "✓", "✓"],
      ["Stripe payments", "✓", "✓", "✓"],
    ],
  },
  {
    category: "Operations",
    rows: [
      ["Instructor payout reports", "—", "✓", "✓"],
      ["Waitlist management", "—", "✓", "✓"],
      ["Bundles & memberships", "—", "✓", "✓"],
      ["Analytics dashboard", "—", "✓", "✓"],
      ["CSV exports", "—", "✓", "✓"],
    ],
  },
  {
    category: "Growth",
    rows: [
      ["Built-in shop", "—", "—", "✓"],
      ["White-label portal", "—", "—", "✓"],
      ["Advanced permissions", "—", "—", "✓"],
      ["Dedicated onboarding", "—", "—", "✓"],
    ],
  },
  {
    category: "Support",
    rows: [
      ["Email support", "Community", "✓", "✓"],
      ["Priority support", "—", "—", "✓"],
    ],
  },
];

const FAQS = [
  {
    q: "Is the Starter plan actually free forever?",
    a: "Yes. No credit card required, no trial period. You get a real, working studio management platform at no cost. We only ask you to upgrade when you genuinely need more.",
  },
  {
    q: "What happens at the end of the 14-day Pro/Studio trial?",
    a: "You'll be prompted to add a payment method. If you don't, you're automatically moved back to Starter — no charges, no surprises.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Absolutely. Upgrade or downgrade whenever you like. Upgrades are prorated; downgrades take effect at the end of your billing cycle.",
  },
  {
    q: "Do you take a cut of my revenue?",
    a: "No. We charge a flat monthly fee. Stripe's standard processing fees (2.9% + 30¢ per transaction) apply separately — that goes to Stripe, not us.",
  },
  {
    q: "What payment methods do clients use?",
    a: "Clients pay via saved card through Stripe — Visa, Mastercard, Amex, and all major networks. Cards are stored securely by Stripe; we never see raw card data.",
  },
  {
    q: "Is there a setup fee or contract?",
    a: "No setup fee, no long-term contract. Pay month-to-month or save with annual billing. Cancel any time.",
  },
];

function Check({ color = "text-emerald-400" }) {
  return <span className={`shrink-0 font-bold ${color}`}>✓</span>;
}
function Cross() {
  return <span className="shrink-0 text-slate-700">—</span>;
}

export default function Pricing() {
  useDocumentTitle("Pricing · StudioFlow");
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const { isCAD } = useCurrency();

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/8 blur-3xl" />
        <div className="absolute top-[50vh] right-0 h-[36rem] w-[36rem] rounded-full bg-violet-500/6 blur-3xl" />
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
          <nav className="hidden items-center gap-7 text-xs font-medium text-slate-400 md:flex">
            <a href="/#product" className="transition hover:text-white">
              Product
            </a>
            <a href="/#features" className="transition hover:text-white">
              Features
            </a>
            <Link to="/pricing" className="text-white">
              Pricing
            </Link>
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
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 pb-4 pt-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400">
            Simple, honest pricing
          </div>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-tight text-white md:text-6xl leading-[1.06]">
            Start free.{" "}
            <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Grow when you&apos;re ready.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base text-slate-400">
            No hidden fees. No revenue cuts. No spreadsheets. Just a studio that
            runs smoother from day one.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/60 px-2 py-1.5">
            <button
              onClick={() => setYearly(false)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${!yearly ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${yearly ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              Yearly
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                Save 15%
              </span>
            </button>
          </div>
        </section>

        {/* Plan cards */}
        <section className="mx-auto mt-10 max-w-6xl px-4">
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => {
              const price = yearly
                ? isCAD
                  ? plan.yearlyPrice
                  : plan.yearlyPriceUsd
                : isCAD
                  ? plan.monthlyPrice
                  : plan.monthlyPriceUsd;
              const currencyLabel = isCAD ? "CAD" : "USD";
              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border ${plan.border} ${plan.bg} p-7`}
                >
                  {plan.badge && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-bold ${plan.badgeBg}`}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div
                    className={`text-[11px] font-bold uppercase tracking-[0.22em] ${plan.accent}`}
                  >
                    {plan.name}
                  </div>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">
                      {price === 0 ? "Free" : `$${price}`}
                    </span>
                    {price > 0 && (
                      <span className="mb-1 text-sm text-slate-500">
                        {currencyLabel} / mo{yearly ? ", billed yearly" : ""}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    {plan.tagline}
                  </div>

                  <Link
                    to={plan.ctaTo}
                    className={`mt-6 block rounded-xl px-5 py-2.5 text-center text-sm font-bold transition ${plan.ctaStyle}`}
                  >
                    {plan.cta}
                  </Link>

                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm text-slate-300"
                      >
                        <Check color={plan.accent.replace("text-", "text-")} />
                        {f}
                      </li>
                    ))}
                    {plan.missing.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm text-slate-600"
                      >
                        <Cross />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Comparison table */}
        <section className="mx-auto mt-24 max-w-5xl px-4">
          <div className="text-center mb-10">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400">
              Compare plans
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Everything side by side.
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800">
            {/* Header */}
            <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-900/80">
              <div className="px-5 py-4 text-xs font-semibold text-slate-500"></div>
              {PLANS.map((p) => (
                <div
                  key={p.name}
                  className={`px-5 py-4 text-center text-sm font-bold ${p.accent}`}
                >
                  {p.name}
                </div>
              ))}
            </div>

            {COMPARE_ROWS.map((group, gi) => (
              <div key={group.category}>
                <div className="bg-slate-950/60 px-5 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    {group.category}
                  </span>
                </div>
                {group.rows.map(([label, s, p, st]) => (
                  <div
                    key={label}
                    className={`grid grid-cols-4 border-t border-slate-800/60 ${gi % 2 === 0 ? "bg-slate-900/30" : "bg-slate-950/20"}`}
                  >
                    <div className="px-5 py-3 text-sm text-slate-400">
                      {label}
                    </div>
                    {[s, p, st].map((val, ci) => (
                      <div
                        key={ci}
                        className="flex items-center justify-center px-5 py-3 text-sm"
                      >
                        {val === "✓" ? (
                          <span
                            className={`font-bold ${ci === 0 ? "text-slate-400" : ci === 1 ? "text-sky-400" : "text-violet-400"}`}
                          >
                            ✓
                          </span>
                        ) : val === "—" ? (
                          <span className="text-slate-700">—</span>
                        ) : (
                          <span className="text-slate-300">{val}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Social proof */}
        <section className="mx-auto mt-20 max-w-4xl px-4">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["4.2 hrs", "saved per week on admin"],
              ["31%", "average revenue lift in 90 days"],
              ["98%", "of studios say they'd never go back"],
            ].map(([stat, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center"
              >
                <div className="text-3xl font-bold text-white">{stat}</div>
                <div className="mt-1.5 text-sm text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-24 max-w-2xl px-4">
          <div className="text-center mb-10">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400">
              FAQ
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Common questions.
            </h2>
          </div>

          <div className="space-y-2">
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-200 hover:text-white transition"
                  >
                    {faq.q}
                    <span
                      className={`ml-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-45" : ""}`}
                    >
                      +
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-slate-800 px-5 py-4 text-sm text-slate-400 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto mt-24 max-w-6xl px-4 pb-24">
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
              <h2 className="mx-auto mt-4 max-w-xl text-4xl font-bold tracking-tight text-white md:text-5xl">
                Your studio deserves better tools.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-slate-400">
                Free to start. No credit card. Set up in minutes.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/signup/owner"
                  className="inline-flex items-center rounded-xl bg-sky-500 px-8 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
                >
                  Start as a studio owner →
                </Link>
                <Link
                  to="/signin"
                  className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/60 px-8 py-3.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800/60 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-600 md:flex-row">
            <div className="font-bold tracking-widest uppercase">
              <span className="text-sky-500/60">Studio</span>Flow
            </div>
            <div className="flex items-center gap-6">
              <Link to="/" className="transition hover:text-slate-400">
                Home
              </Link>
              <Link to="/pricing" className="transition hover:text-slate-400">
                Pricing
              </Link>
              <Link to="/contact" className="transition hover:text-slate-400">
                Contact
              </Link>
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
