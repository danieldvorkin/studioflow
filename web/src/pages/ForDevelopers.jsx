import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useEffect, useRef, useState } from "react";

// ─── Animated terminal typewriter ────────────────────────────────────────────
function TerminalLine({ prefix, text, delay = 0, color = "text-slate-200" }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <div className="flex gap-2">
      {prefix && (
        <span className="select-none text-slate-600 shrink-0">{prefix}</span>
      )}
      <span
        className={`font-mono text-sm ${color} whitespace-pre-wrap break-all`}
      >
        {displayed}
        {started && displayed.length < text.length && (
          <span className="animate-pulse">▌</span>
        )}
      </span>
    </div>
  );
}

function ApiTerminalMockup() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
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
      className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/90 shadow-2xl font-mono text-sm"
    >
      {/* window bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950/80 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-rose-500/70" />
        <span className="h-3 w-3 rounded-full bg-amber-500/70" />
        <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-[11px] text-slate-500">
          studioflow-integration.sh
        </span>
      </div>
      <div className="px-5 py-5 space-y-1.5 min-h-[280px]">
        {visible && (
          <>
            <TerminalLine
              prefix="$"
              text="curl https://api.joinstudioflow.com/api/v1/me \\"
              delay={0}
              color="text-slate-300"
            />
            <TerminalLine
              text='  -H "Authorization: Bearer sf_a1b2c3d4..."'
              delay={700}
              color="text-slate-400"
            />
            <div className="pt-2" />
            <TerminalLine text="{" delay={1500} color="text-slate-300" />
            <TerminalLine
              text='  "user": { "name": "Alex Rivera", "role_name": "owner" },'
              delay={1700}
              color="text-emerald-300"
            />
            <TerminalLine
              text='  "studio": { "name": "Zen Flow Studio", "slug": "zen-flow" },'
              delay={2100}
              color="text-sky-300"
            />
            <TerminalLine
              text='  "api_token": { "name": "My integration", "last_used_at": "..." }'
              delay={2500}
              color="text-violet-300"
            />
            <TerminalLine text="}" delay={2900} color="text-slate-300" />
            <div className="pt-2" />
            <TerminalLine
              prefix="$"
              text="# 200 OK — 34ms"
              delay={3200}
              color="text-emerald-400"
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Animated use-case card ───────────────────────────────────────────────────
function UseCaseCard({ icon, title, color, border, bg, snippet, description }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-2xl border ${border} ${bg} p-6 flex flex-col gap-4 transition`}
    >
      <div className="text-3xl">{icon}</div>
      <div className={`text-sm font-bold ${color}`}>{title}</div>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      {snippet && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`text-left text-xs font-semibold ${color} hover:opacity-80 transition`}
          >
            {open ? "▾ Hide example" : "▸ See example"}
          </button>
          {open && (
            <pre className="rounded-lg bg-slate-950 border border-slate-800 px-4 py-3 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {snippet}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

// ─── Endpoint row ─────────────────────────────────────────────────────────────
function EndpointRow({ method, path, description }) {
  const colors = {
    GET: "bg-sky-900/60 text-sky-300 border-sky-700",
    POST: "bg-green-900/50 text-green-300 border-green-700",
    DELETE: "bg-red-900/40 text-red-300 border-red-800",
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-800/60 last:border-0">
      <span
        className={`mt-0.5 inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-bold ${colors[method]}`}
      >
        {method}
      </span>
      <div className="min-w-0">
        <code className="text-xs font-mono text-slate-200">{path}</code>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ForDevelopers() {
  useDocumentTitle("API for Studio Owners — StudioFlow");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute top-[55vh] right-[-5vw] h-[32rem] w-[32rem] rounded-full bg-sky-600/8 blur-3xl" />
        <div className="absolute top-[80vh] left-0 h-[28rem] w-[28rem] rounded-full bg-violet-600/8 blur-3xl" />
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
            <Link to="/for-owners" className="hover:text-white transition">
              For Owners
            </Link>
            <Link to="/for-instructors" className="hover:text-white transition">
              For Instructors
            </Link>
            <Link to="/api-docs" className="hover:text-white transition">
              API Docs
            </Link>
            <Link to="/pricing" className="hover:text-white transition">
              Pricing
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
        {/* ── Hero ── */}
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
            StudioFlow API · v1
          </div>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-white md:text-6xl leading-[1.05]">
            Your studio data.{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
              Your integrations.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-slate-400">
            The StudioFlow REST API gives studio owners programmatic access to
            their data — build automations, connect your tools, and extend
            StudioFlow to fit exactly how you run your studio.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/signup/owner"
              className="inline-flex items-center rounded-xl bg-indigo-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-indigo-400 transition"
            >
              Create your studio →
            </Link>
            <Link
              to="/api-docs"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
            >
              Read the docs
            </Link>
          </div>

          {/* Stat strip */}
          <div className="mt-12 flex flex-wrap justify-center gap-8">
            {[
              { value: "REST", label: "API design" },
              { value: "Bearer", label: "token auth" },
              { value: "JSON", label: "response format" },
              { value: "<50ms", label: "p99 latency" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-xl font-bold text-slate-100">{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Terminal mockup ── */}
        <section className="mx-auto max-w-2xl px-4 pb-20">
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-sky-500/10 to-emerald-500/10 blur-2xl" />
            <div className="relative">
              <ApiTerminalMockup />
            </div>
          </div>
        </section>

        {/* ── What you can build ── */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-12">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-400">
              Use cases
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              What owners build with the API.
            </h2>
            <p className="mt-3 text-slate-400 max-w-lg mx-auto text-sm">
              From Notion dashboards to Slack alerts to custom reporting — if
              your studio runs it, you can script it.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <UseCaseCard
              icon="📊"
              title="Custom dashboards"
              color="text-sky-400"
              border="border-sky-500/20"
              bg="bg-sky-500/5"
              description="Pull your studio's class schedules, booking counts, and revenue into Notion, Airtable, Google Sheets, or any BI tool you already use."
              snippet={`GET /api/v1/me\n\n// Returns your studio's live profile\n// and last-used token metadata`}
            />
            <UseCaseCard
              icon="🔔"
              title="Slack & webhook alerts"
              color="text-violet-400"
              border="border-violet-500/20"
              bg="bg-violet-500/5"
              description="Ping your team on Slack when a session fills up, a new client joins, or a payment lands — all triggered from a simple cron + API call."
              snippet={`// Example: send Slack alert on new booking\nconst res = await fetch('/api/v1/me', {\n  headers: { Authorization: 'Bearer ' + TOKEN }\n});\nif (res.ok) slackNotify(await res.json());`}
            />
            <UseCaseCard
              icon="🗓️"
              title="Calendar sync"
              color="text-emerald-400"
              border="border-emerald-500/20"
              bg="bg-emerald-500/5"
              description="Sync your class schedule to Google Calendar, Outlook, or any calendar app. Keep every instructor's schedule up to date automatically."
              snippet={`# Fetch studio details for calendar sync\ncurl /api/v1/studio \\\n  -H "Authorization: Bearer $SF_TOKEN"`}
            />
            <UseCaseCard
              icon="🤖"
              title="AI assistants"
              color="text-amber-400"
              border="border-amber-500/20"
              bg="bg-amber-500/5"
              description="Feed your studio data into an AI assistant or LLM to answer questions like 'What was our best-performing class last month?' without leaving your workflow."
              snippet={`// Give your AI the studio context\nconst { studio, user } = await fetchMe(token);\nconst prompt = \`Studio: \${studio.name}. Role: \${user.role_name}\`;`}
            />
            <UseCaseCard
              icon="📋"
              title="Automated reports"
              color="text-fuchsia-400"
              border="border-fuchsia-500/20"
              bg="bg-fuchsia-500/5"
              description="Schedule weekly or monthly reports that pull from the API and email a formatted PDF to your accountant, investors, or co-owners automatically."
              snippet={`# Run with cron every Monday 9am\n0 9 * * 1 node generate-weekly-report.mjs`}
            />
            <UseCaseCard
              icon="🔗"
              title="Tool integrations"
              color="text-rose-400"
              border="border-rose-500/20"
              bg="bg-rose-500/5"
              description="Connect StudioFlow to Zapier, Make, n8n, or any no-code automation platform. The REST API works everywhere a webhook does."
              snippet={`// Zapier HTTP action\nURL: https://api.joinstudioflow.com/api/v1/me\nMethod: GET\nHeaders: Authorization: Bearer {{token}}`}
            />
          </div>
        </section>

        {/* ── Available endpoints ── */}
        <section className="mx-auto max-w-4xl px-4 py-16">
          <div className="text-center mb-10">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400">
              REST endpoints · v1
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Available today. More shipping soon.
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-950/60 px-6 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Base URL: https://api.joinstudioflow.com
              </span>
              <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-widest">
                Stable · v1
              </span>
            </div>
            <div className="px-6 py-2">
              <EndpointRow
                method="GET"
                path="/api/v1/me"
                description="Your user profile, role, and token metadata"
              />
              <EndpointRow
                method="GET"
                path="/api/v1/studio"
                description="Studio name, slug, invite code, and onboarding status"
              />
              <EndpointRow
                method="GET"
                path="/api/tokens"
                description="List all tokens you've generated for this studio"
              />
              <EndpointRow
                method="POST"
                path="/api/tokens"
                description="Generate a new named API token (owner-only)"
              />
              <EndpointRow
                method="DELETE"
                path="/api/tokens/:id"
                description="Permanently revoke a token"
              />
            </div>
            <div className="border-t border-slate-800 bg-slate-950/30 px-6 py-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                More endpoints — clients, sessions, bookings, payouts — are on
                the roadmap.
              </p>
              <Link
                to="/contact"
                className="text-xs font-semibold text-indigo-400 hover:underline shrink-0"
              >
                Request an endpoint →
              </Link>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-12">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-400">
              Getting started
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              From zero to first API call in 3 minutes.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Create your studio",
                color: "text-sky-400",
                border: "border-sky-500/20",
                bg: "from-sky-500/10 to-transparent",
                body: "Sign up as a Studio Owner. Your studio is provisioned instantly — no credit card required to start.",
                cta: { label: "Sign up free →", to: "/signup/owner" },
              },
              {
                step: "02",
                title: "Generate an API token",
                color: "text-indigo-400",
                border: "border-indigo-500/20",
                bg: "from-indigo-500/10 to-transparent",
                body: 'Go to Owner → API Tokens and click "Generate token". Give it a name, copy the secret, and store it somewhere safe.',
                cta: { label: "Token dashboard →", to: "/owner/api-tokens" },
              },
              {
                step: "03",
                title: "Make your first call",
                color: "text-emerald-400",
                border: "border-emerald-500/20",
                bg: "from-emerald-500/10 to-transparent",
                body: "Pass the token in the Authorization header. JSON comes back. Read the full docs to explore everything you can do.",
                cta: { label: "Read the docs →", to: "/api-docs" },
              },
            ].map(({ step, title, color, border, bg, body, cta }) => (
              <div
                key={step}
                className={`rounded-2xl border ${border} bg-gradient-to-b ${bg} p-6 flex flex-col gap-3`}
              >
                <div
                  className={`text-4xl font-black ${color} opacity-30 leading-none`}
                >
                  {step}
                </div>
                <div className={`text-sm font-bold ${color}`}>{title}</div>
                <p className="text-sm text-slate-400 leading-relaxed flex-1">
                  {body}
                </p>
                <Link
                  to={cta.to}
                  className={`mt-1 text-xs font-semibold ${color} hover:opacity-80 transition`}
                >
                  {cta.label}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── Security ── */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="text-center mb-10">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-rose-400">
              Security
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Built for production, not just demos.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "🔑",
                title: "Hashed tokens",
                color: "text-sky-400",
                body: "Raw tokens are hashed with bcrypt before storage. Even if the database were compromised, your tokens can't be reconstructed.",
              },
              {
                icon: "🏷️",
                title: "Named & auditable",
                color: "text-violet-400",
                body: "Every token has a human-readable name. Last-used timestamps let you spot stale or suspicious activity at a glance.",
              },
              {
                icon: "🚫",
                title: "One-click revocation",
                color: "text-rose-400",
                body: "Revoke any token instantly from the dashboard. Revocation is permanent and takes effect on the next request.",
              },
              {
                icon: "🏠",
                title: "Studio-scoped",
                color: "text-emerald-400",
                body: "Tokens are scoped to a single studio. An exposed token can't access any other studio's data on the platform.",
              },
            ].map(({ icon, title, color, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3"
              >
                <div className="text-2xl">{icon}</div>
                <div className={`text-sm font-bold ${color}`}>{title}</div>
                <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Owners CTA crosslink ── */}
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-sky-500/5 to-transparent p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-400 mb-2">
                Already a StudioFlow owner?
              </div>
              <h3 className="text-xl font-bold text-white">
                Your API token is waiting.
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Log in, head to Owner → API Tokens, and generate your first
                token in under 30 seconds.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                to="/owner/api-tokens"
                className="inline-flex items-center rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-indigo-400 transition"
              >
                Generate token →
              </Link>
              <Link
                to="/api-docs"
                className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
              >
                Read docs
              </Link>
            </div>
          </div>
        </section>

        {/* ── Roadmap teaser ── */}
        <section className="mx-auto max-w-4xl px-4 py-16">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-400">
                Coming soon
              </div>
              <span className="rounded-full bg-amber-900/40 border border-amber-700 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                Roadmap
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-5">
              What&apos;s next for the API.
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  endpoint: "GET /api/v1/clients",
                  note: "Client list & profiles",
                },
                {
                  endpoint: "GET /api/v1/sessions",
                  note: "Upcoming class sessions",
                },
                {
                  endpoint: "GET /api/v1/bookings",
                  note: "All bookings with status",
                },
                { endpoint: "GET /api/v1/payments", note: "Payment history" },
                {
                  endpoint: "GET /api/v1/payouts",
                  note: "Instructor payout records",
                },
                {
                  endpoint: "POST /api/v1/webhooks",
                  note: "Push events to your endpoint",
                },
              ].map(({ endpoint, note }) => (
                <div
                  key={endpoint}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400/60 shrink-0" />
                  <div className="min-w-0">
                    <code className="text-xs font-mono text-slate-300 block truncate">
                      {endpoint}
                    </code>
                    <span className="text-[10px] text-slate-500">{note}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-slate-500">
              Want to influence the roadmap?{" "}
              <Link to="/contact" className="text-indigo-400 hover:underline">
                Tell us what you need.
              </Link>
            </p>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="mx-auto max-w-4xl px-4 py-8 pb-24">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-10 text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h2 className="text-3xl font-bold text-white">
              Ready to build on StudioFlow?
            </h2>
            <p className="mt-3 text-slate-400 max-w-sm mx-auto">
              Create your studio and generate your first API token in under 5
              minutes. No credit card required.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/signup/owner"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-8 py-3.5 text-sm font-bold text-slate-950 hover:bg-indigo-400 transition"
              >
                Create your studio free →
              </Link>
              <Link
                to="/api-docs"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-8 py-3.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
              >
                Browse the docs
              </Link>
            </div>
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
            <Link to="/for-clients" className="hover:text-slate-400 transition">
              For Clients
            </Link>
            <Link to="/api-docs" className="hover:text-slate-400 transition">
              API Docs
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
