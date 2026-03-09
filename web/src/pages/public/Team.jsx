import { Link } from "react-router-dom";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

function GithubIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function WebIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}

export default function Team() {
  useDocumentTitle("Team — StudioFlow");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute top-[50vh] -left-20 h-[36rem] w-[36rem] rounded-full bg-violet-600/8 blur-3xl" />
        <div className="absolute top-[70vh] right-0 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/8 blur-3xl" />
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
            <Link to="/#features" className="hover:text-white transition">
              Features
            </Link>
            <Link to="/for-owners" className="hover:text-white transition">
              For Owners
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

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400 mb-6">
            The team
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            Built by people who care about the craft.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-400">
            StudioFlow started with a clear conviction: studio owners deserve
            software that works as hard as they do. Every feature exists because
            a real studio asked for it.
          </p>
        </div>

        {/* Daniel Dvorkin */}
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-10 md:grid-cols-5 items-start">
            {/* Avatar column */}
            <div className="md:col-span-2 flex flex-col items-center md:items-start gap-5">
              <div className="relative">
                <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-sky-500/30 to-violet-500/30 blur-xl" />
                <div className="relative h-36 w-36 rounded-full bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-700 flex items-center justify-center text-4xl font-bold text-white shadow-2xl">
                  DD
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white">
                  Daniel Dvorkin
                </h2>
                <div className="mt-1 text-sm text-sky-400 font-semibold">
                  Founder &amp; Engineering Lead
                </div>
                <div className="mt-1 text-[12px] text-slate-500">
                  Vaughan, Ontario · Canada
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/danieldvorkin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-[11px] font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition"
                >
                  <GithubIcon /> GitHub
                </a>
                <a
                  href="https://linkedin.com/in/danieldvorkin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-[11px] font-semibold text-slate-400 hover:text-sky-400 hover:border-sky-500/40 transition"
                >
                  <LinkedInIcon /> LinkedIn
                </a>
                <a
                  href="http://www.danieldvorkin.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-[11px] font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition"
                >
                  <WebIcon /> Site
                </a>
              </div>

              <div className="w-full space-y-2">
                {[
                  {
                    label: "Ruby on Rails",
                    color: "from-rose-500 to-orange-500",
                  },
                  {
                    label: "React / GraphQL",
                    color: "from-sky-500 to-cyan-400",
                  },
                  { label: "PostgreSQL", color: "from-indigo-500 to-blue-500" },
                  {
                    label: "Stripe & Payments",
                    color: "from-violet-500 to-purple-500",
                  },
                  {
                    label: "Full-stack architecture",
                    color: "from-emerald-500 to-teal-500",
                  },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full bg-gradient-to-r ${color} shrink-0`}
                    />
                    <span className="text-[11px] text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bio column */}
            <div className="md:col-span-3 space-y-5">
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-8 space-y-5">
                <p className="text-slate-200 leading-relaxed text-[15px]">
                  Daniel is a full-stack software engineer based in the Toronto
                  area with a sharp focus on web development and database-driven
                  administrative tooling. He built StudioFlow from the ground up
                  — solo — because he saw studio owners drowning in operational
                  complexity that better software could simply eliminate.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  With deep fluency across the entire stack — from PostgreSQL
                  schemas and Rails API design to GraphQL resolvers, React
                  interfaces, and Stripe payment flows — Daniel brings
                  product-quality thinking to every layer of the platform. He's
                  not just an engineer who writes clean code; he's an engineer
                  who asks why something exists before deciding how to build it.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  StudioFlow reflects his philosophy: the best software is
                  invisible. It handles the complexity so the person using it
                  doesn't have to think about it. When a studio owner can run
                  their Monday morning without touching a spreadsheet, that's
                  working software. When an instructor can trust their payout
                  number without asking twice, that's working software. That's
                  what Daniel builds.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Outside of StudioFlow, Daniel has shipped a range of web
                  applications spanning dashboard tooling, e-commerce, and
                  interactive audio visualization — demonstrating a genuine
                  range as an engineer and a consistent commitment to craft that
                  goes beyond the job description.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { stat: "77+", label: "public repos" },
                  { stat: "443", label: "contributions · last year" },
                  { stat: "Solo", label: "StudioFlow built" },
                ].map(({ stat, label }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center"
                  >
                    <div className="text-xl font-bold text-sky-400">{stat}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
                <div className="text-[11px] font-bold uppercase tracking-widest text-sky-400 mb-2">
                  The StudioFlow stack
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Ruby on Rails",
                    "React",
                    "GraphQL",
                    "PostgreSQL",
                    "Stripe",
                    "Tailwind CSS",
                    "JWT Auth",
                    "ActionMailer",
                    "Heroku",
                    "Netlify",
                  ].map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mission statement */}
        <div className="mx-auto mt-20 max-w-3xl rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-10 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-sky-500/10 blur-2xl" />
          </div>
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400 mb-3">
              Why we built this
            </div>
            <h2 className="text-2xl font-bold text-white">
              "Studio owners are running genuinely hard businesses. They
              deserved tools that actually help."
            </h2>
            <p className="mx-auto mt-4 text-sm text-slate-400 max-w-lg">
              StudioFlow doesn't exist to capture market share. It exists to
              give studio owners, instructors, and clients a better experience —
              one that makes running a studio feel less like admin work and more
              like what it actually is: building a community.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup/owner"
                className="inline-flex items-center rounded-xl bg-sky-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-sky-400 transition"
              >
                Start your studio →
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-800/60 py-8 mt-16">
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
