import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useState } from "react";

export default function Contact() {
  useDocumentTitle("Contact — StudioFlow");
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    // Simulate a send — in production wire this to a real endpoint
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute top-[70vh] right-0 h-[32rem] w-[32rem] rounded-full bg-violet-600/8 blur-3xl" />
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
            <Link to="/team" className="hover:text-white transition">
              Team
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
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400 mb-6">
            Contact
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            Real people. Actually reachable.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-slate-400">
            Questions about StudioFlow, your studio setup, pricing, or anything
            else — we read every message and we actually reply. No ticket
            queues. No bots.
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-5">
          {/* Left — contact info */}
          <div className="md:col-span-2 space-y-6">
            {[
              {
                icon: "⚡",
                title: "Same-day responses",
                body: "We aim to respond within hours, not days. Send us a message and you'll hear back from a real human.",
              },
              {
                icon: "🛠️",
                title: "Feature requests welcome",
                body: "Built something specific to your workflow? Tell us. StudioFlow is shaped by studio owners who actually use it.",
              },
              {
                icon: "🧘",
                title: "Studio setup help",
                body: "Need a hand getting your schedule, instructors, or payment rates configured? We'll walk you through it.",
              },
              {
                icon: "💬",
                title: "General inquiries",
                body: "Curious about pricing, multi-location support, or anything else? Reach out — there are no dumb questions here.",
              },
            ].map(({ icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex gap-4"
              >
                <div className="text-2xl shrink-0">{icon}</div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {title}
                  </div>
                  <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                    {body}
                  </p>
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-sky-400 mb-2">
                Direct email
              </div>
              <a
                href="mailto:hello@joinstudioflow.com"
                className="text-sm font-semibold text-sky-300 hover:text-sky-200 transition"
              >
                hello@joinstudioflow.com
              </a>
              <p className="mt-1 text-[11px] text-slate-500">
                We typically respond within a few hours during business hours.
              </p>
            </div>
          </div>

          {/* Right — form */}
          <div className="md:col-span-3">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-8">
              {sent ? (
                <div className="text-center py-12 space-y-4">
                  <div className="text-5xl">📬</div>
                  <div className="text-xl font-bold text-emerald-400">
                    Message sent!
                  </div>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">
                    We'll get back to you shortly. In the meantime, feel free to
                    explore the platform.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                    <button
                      onClick={() => {
                        setSent(false);
                        setForm({
                          name: "",
                          email: "",
                          subject: "",
                          message: "",
                        });
                      }}
                      className="text-xs text-sky-400 hover:text-sky-300 transition"
                    >
                      Send another message
                    </button>
                    <Link
                      to="/"
                      className="text-xs text-slate-400 hover:text-white transition"
                    >
                      ← Back to home
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="text-sm font-semibold text-slate-200 mb-1">
                    Send us a message
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-slate-500 mb-1.5 font-semibold">
                        Name
                      </label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        placeholder="Your name"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-sky-500/60 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-slate-500 mb-1.5 font-semibold">
                        Email
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                        placeholder="you@studio.com"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-sky-500/60 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest text-slate-500 mb-1.5 font-semibold">
                      Subject
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) =>
                        setForm({ ...form, subject: e.target.value })
                      }
                      required
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 focus:border-sky-500/60 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition"
                    >
                      <option value="" disabled>
                        Select a topic...
                      </option>
                      <option value="getting-started">Getting started</option>
                      <option value="pricing">Pricing & plans</option>
                      <option value="feature-request">Feature request</option>
                      <option value="studio-setup">Studio setup help</option>
                      <option value="bug">Something's not working</option>
                      <option value="partnership">Partnership inquiry</option>
                      <option value="other">Something else</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest text-slate-500 mb-1.5 font-semibold">
                      Message
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      placeholder="Tell us what's on your mind. The more detail, the faster we can help."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-sky-500/60 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full rounded-xl bg-sky-500 py-3 text-sm font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-60 transition"
                  >
                    {sending ? "Sending…" : "Send message →"}
                  </button>
                  <p className="text-center text-[11px] text-slate-600">
                    We typically reply within a few hours.
                  </p>
                </form>
              )}
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
            <Link to="/team" className="hover:text-slate-400 transition">
              Team
            </Link>
          </div>
          <div>© {new Date().getFullYear()} StudioFlow</div>
        </div>
      </footer>
    </div>
  );
}
