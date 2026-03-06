import { useState } from "react";
import { Link } from "react-router-dom";

// ─── Utility helpers ──────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="ml-auto flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200 transition"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function Code({ children, language = "bash" }) {
  return (
    <div className="relative rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/60">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">
          {language}
        </span>
        <CopyButton text={children} />
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-sm font-mono text-slate-200 leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Badge({ method }) {
  const colors = {
    GET: "bg-sky-900/60 text-sky-300 border-sky-700",
    POST: "bg-green-900/50 text-green-300 border-green-700",
    DELETE: "bg-red-900/40 text-red-300 border-red-800",
    PATCH: "bg-amber-900/40 text-amber-300 border-amber-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold border ${
        colors[method] ?? "bg-slate-800 text-slate-300 border-slate-600"
      }`}
    >
      {method}
    </span>
  );
}

function Param({ name, type, required, description }) {
  return (
    <div className="py-2.5 border-b border-slate-800 last:border-0 flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <code className="text-sm font-mono text-sky-300">{name}</code>
        <span className="text-xs text-slate-500">{type}</span>
        {required && (
          <span className="text-xs font-semibold text-red-400">required</span>
        )}
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  );
}

function ResponseField({ name, type, description }) {
  return (
    <div className="py-2 border-b border-slate-800 last:border-0 flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <code className="text-sm font-mono text-emerald-300">{name}</code>
        <span className="text-xs text-slate-500 italic">{type}</span>
      </div>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  );
}

function Section({ id, children }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-5">
      {children}
    </section>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-3">
      {children}
    </h2>
  );
}

function EndpointCard({
  method,
  path,
  title,
  description,
  params,
  responseFields,
  requestExample,
  responseExample,
}) {
  const [showRequest, setShowRequest] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-start gap-3 flex-wrap border-b border-slate-800 bg-slate-900/40">
        <Badge method={method} />
        <div className="flex flex-col gap-0.5">
          <code className="text-sm font-mono text-slate-100">{path}</code>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        <p className="text-sm font-semibold text-slate-300">{title}</p>

        {params && params.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Headers / Parameters
            </p>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 divide-y divide-slate-800">
              {params.map((p) => (
                <Param key={p.name} {...p} />
              ))}
            </div>
          </div>
        )}

        {responseFields && responseFields.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Response fields
            </p>
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 divide-y divide-slate-800">
              {responseFields.map((f) => (
                <ResponseField key={f.name} {...f} />
              ))}
            </div>
          </div>
        )}

        {requestExample && (
          <div>
            <button
              type="button"
              onClick={() => setShowRequest((v) => !v)}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
            >
              {showRequest ? "▾ Hide" : "▸ Show"} request example
            </button>
            {showRequest && (
              <div className="mt-2">
                <Code language="shell">{requestExample}</Code>
              </div>
            )}
          </div>
        )}

        {responseExample && (
          <div>
            <button
              type="button"
              onClick={() => setShowResponse((v) => !v)}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
            >
              {showResponse ? "▾ Hide" : "▸ Show"} response example
            </button>
            {showResponse && (
              <div className="mt-2">
                <Code language="json">{responseExample}</Code>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const BASE_URL = "https://api.joinstudioflow.com";

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "errors", label: "Errors" },
  { id: "endpoints-profile", label: "Profile & Auth" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function ApiDocs() {
  const [activeNav, setActiveNav] = useState("overview");

  const scrollTo = (id) => {
    setActiveNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-300">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col gap-2 border-r border-slate-800 px-4 py-8 sticky top-0 h-screen overflow-y-auto">
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-sky-400/80 mb-0.5">
            Studio<strong className="text-slate-300">Flow</strong>
          </div>
          <p className="text-xs text-slate-500">API Reference</p>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className={`text-left rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeNav === item.id
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-slate-800">
          <Link
            to="/owner/api-tokens"
            className="text-xs text-sky-400 hover:underline"
          >
            ← Manage your tokens
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-8 py-10 space-y-16">
        {/* Hero */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-900/30 border border-sky-700 px-3 py-1 text-xs text-sky-300 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            v1 · REST
          </div>
          <h1 className="text-3xl font-bold text-slate-100">StudioFlow API</h1>
          <p className="text-slate-400 max-w-xl">
            The StudioFlow REST API lets studio owners build integrations,
            automate workflows, and access their studio&apos;s data
            programmatically. All endpoints require an API token.
          </p>
          <div className="flex gap-3 pt-1">
            <Link
              to="/owner/api-tokens"
              className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition"
            >
              Get an API token
            </Link>
          </div>
        </div>

        {/* Overview */}
        <Section id="overview">
          <SectionTitle>Overview</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Base URL", value: BASE_URL },
              { label: "Protocol", value: "HTTPS only" },
              { label: "Auth", value: "Bearer token (Authorization header)" },
              { label: "Format", value: "JSON" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
                  {label}
                </p>
                <p className="text-sm text-slate-200 font-mono">{value}</p>
              </div>
            ))}
          </div>

          <Code language="shell">{`# All requests must use HTTPS and include your token
curl ${BASE_URL}/api/v1/me \\
  -H "Authorization: Bearer sf_your_token_here"`}</Code>
        </Section>

        {/* Authentication */}
        <Section id="authentication">
          <SectionTitle>Authentication</SectionTitle>
          <p className="text-sm text-slate-400">
            Every request to the StudioFlow API must include an{" "}
            <code className="text-slate-200 bg-slate-800 px-1 rounded text-xs">
              Authorization
            </code>{" "}
            header containing your API token as a Bearer credential.
          </p>

          <Code language="shell">{`Authorization: Bearer sf_xxxxxxxxxxxxxxxx`}</Code>

          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5 space-y-4">
            <h3 className="font-semibold text-slate-200">Generating a token</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-400">
              <li>
                Navigate to{" "}
                <Link
                  to="/owner/api-tokens"
                  className="text-sky-400 hover:underline"
                >
                  Owner → API Tokens
                </Link>{" "}
                in the StudioFlow dashboard.
              </li>
              <li>
                Click <strong className="text-slate-300">Generate token</strong>{" "}
                and give it a descriptive name.
              </li>
              <li>
                Copy the token immediately — it is shown only once and cannot be
                recovered.
              </li>
              <li>
                Store the token securely (e.g. environment variables, a secrets
                manager) and never commit it to version control.
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-4 text-sm text-amber-300">
            <p className="font-semibold mb-1">⚠ Keep your token secret</p>
            <p className="text-xs text-amber-400/80">
              API tokens grant full read access to your studio&apos;s data.
              Revoke and rotate tokens immediately if they are ever exposed.
            </p>
          </div>
        </Section>

        {/* Errors */}
        <Section id="errors">
          <SectionTitle>Errors</SectionTitle>
          <p className="text-sm text-slate-400">
            The API uses standard HTTP status codes and returns a JSON body with
            an{" "}
            <code className="text-slate-200 bg-slate-800 px-1 rounded text-xs">
              error
            </code>{" "}
            field describing what went wrong.
          </p>

          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 border-b border-slate-800">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Meaning
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[
                  ["200", "OK — request succeeded"],
                  ["201", "Created — resource was created"],
                  ["400", "Bad Request — invalid parameters"],
                  ["401", "Unauthorized — missing or invalid token"],
                  [
                    "403",
                    "Forbidden — token valid but insufficient permissions",
                  ],
                  ["404", "Not Found — resource does not exist"],
                  ["422", "Unprocessable — validation error"],
                  [
                    "500",
                    "Internal Server Error — something went wrong on our end",
                  ],
                ].map(([code, meaning]) => (
                  <tr key={code} className="bg-slate-950/30">
                    <td className="px-4 py-2.5">
                      <code className="font-mono text-slate-300">{code}</code>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Code language="json">{`// Error response shape
{
  "error": "Invalid or revoked API token"
}`}</Code>
        </Section>

        {/* Profile & Auth endpoints */}
        <Section id="endpoints-profile">
          <SectionTitle>Profile &amp; Auth</SectionTitle>
          <p className="text-sm text-slate-400">
            These endpoints expose the identity of the token&apos;s owner and
            the associated studio.
          </p>

          <EndpointCard
            method="GET"
            path="/api/v1/me"
            title="Get current user & studio"
            description="Returns the authenticated user's profile, studio, and token metadata."
            params={[
              {
                name: "Authorization",
                type: "header",
                required: true,
                description: "Bearer <token> — your StudioFlow API token.",
              },
            ]}
            responseFields={[
              {
                name: "user.id",
                type: "integer",
                description: "Unique user ID.",
              },
              {
                name: "user.email",
                type: "string",
                description: "Email address of the token owner.",
              },
              {
                name: "user.name",
                type: "string",
                description: "Display name.",
              },
              {
                name: "user.role",
                type: "integer",
                description:
                  "Role integer: 0=owner, 1=staff, 2=instructor, 3=client.",
              },
              {
                name: "user.role_name",
                type: "string",
                description: 'Human-readable role: "owner", "staff", etc.',
              },
              {
                name: "user.avatar_url",
                type: "string|null",
                description: "Profile picture URL.",
              },
              { name: "studio.id", type: "integer", description: "Studio ID." },
              {
                name: "studio.name",
                type: "string",
                description: "Studio display name.",
              },
              {
                name: "studio.slug",
                type: "string",
                description: "URL-safe studio identifier.",
              },
              {
                name: "api_token.name",
                type: "string",
                description: "Token label as set by the owner.",
              },
              {
                name: "api_token.prefix",
                type: "string",
                description: "First 8 characters of the token (safe to log).",
              },
              {
                name: "api_token.last_used_at",
                type: "ISO8601|null",
                description: "When this token was last used.",
              },
            ]}
            requestExample={`curl ${BASE_URL}/api/v1/me \\
  -H "Authorization: Bearer sf_your_token_here" \\
  -H "Accept: application/json"`}
            responseExample={`{
  "user": {
    "id": 42,
    "email": "owner@mystudio.com",
    "name": "Alex Rivera",
    "role": 0,
    "role_name": "owner",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "active": true,
    "studio_id": 7
  },
  "studio": {
    "id": 7,
    "name": "Zen Flow Studio",
    "slug": "zen-flow"
  },
  "api_token": {
    "name": "My integration script",
    "prefix": "a1b2c3d4",
    "last_used_at": "2026-03-06T14:22:11.000Z",
    "created_at": "2026-03-01T09:00:00.000Z"
  }
}`}
          />

          <EndpointCard
            method="GET"
            path="/api/v1/studio"
            title="Get studio details"
            description="Returns details for the studio associated with the API token."
            params={[
              {
                name: "Authorization",
                type: "header",
                required: true,
                description: "Bearer <token> — your StudioFlow API token.",
              },
            ]}
            responseFields={[
              { name: "studio.id", type: "integer", description: "Studio ID." },
              {
                name: "studio.name",
                type: "string",
                description: "Studio display name.",
              },
              {
                name: "studio.slug",
                type: "string",
                description: "URL-safe slug.",
              },
              {
                name: "studio.invite_code",
                type: "string",
                description: "Join code for the studio.",
              },
              {
                name: "studio.onboarding_completed_at",
                type: "ISO8601|null",
                description: "When initial setup was completed.",
              },
            ]}
            requestExample={`curl ${BASE_URL}/api/v1/studio \\
  -H "Authorization: Bearer sf_your_token_here" \\
  -H "Accept: application/json"`}
            responseExample={`{
  "studio": {
    "id": 7,
    "name": "Zen Flow Studio",
    "slug": "zen-flow",
    "invite_code": "ZF-8821",
    "onboarding_completed_at": "2025-11-15T10:30:00.000Z"
  }
}`}
          />
        </Section>

        {/* Footer */}
        <footer className="border-t border-slate-800 pt-8 text-xs text-slate-600 space-y-1">
          <p>StudioFlow API · v1</p>
          <p>
            Need help?{" "}
            <a href="/contact" className="text-sky-500 hover:underline">
              Contact support
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
