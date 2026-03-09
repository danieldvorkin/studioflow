import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL =
  import.meta.env.VITE_API_URL || "https://api.joinstudioflow.com";

// ─── Code snippet generators ──────────────────────────────────────────────────

function buildSnippets(method, path, token) {
  const url = `${BASE_URL}${path}`;
  const tok = token || "sf_your_token_here";
  const methodUp = method.toUpperCase();

  const curl =
    `curl -X ${methodUp} '${url}' \\\n` +
    `  -H 'Authorization: Bearer ${tok}' \\\n` +
    `  -H 'Accept: application/json'`;

  const js =
    `const response = await fetch('${url}', {\n` +
    `  method: '${methodUp}',\n` +
    `  headers: {\n` +
    `    'Authorization': 'Bearer ${tok}',\n` +
    `    'Accept': 'application/json',\n` +
    `  },\n` +
    `});\n` +
    `const data = await response.json();\n` +
    `console.log(data);`;

  const python =
    `import requests\n\n` +
    `response = requests.${method.toLowerCase()}(\n` +
    `    '${url}',\n` +
    `    headers={'Authorization': 'Bearer ${tok}'},\n` +
    `)\n` +
    `print(response.json())`;

  const methodClass =
    { GET: "Get", POST: "Post", PATCH: "Patch", DELETE: "Delete" }[methodUp] ||
    "Get";

  const ruby =
    `require 'net/http'\n` +
    `require 'json'\n` +
    `require 'uri'\n\n` +
    `uri = URI('${url}')\n` +
    `http = Net::HTTP.new(uri.host, uri.port)\n` +
    `http.use_ssl = true\n\n` +
    `request = Net::HTTP::${methodClass}.new(uri)\n` +
    `request['Authorization'] = 'Bearer ${tok}'\n` +
    `request['Accept'] = 'application/json'\n\n` +
    `response = http.request(request)\n` +
    `puts JSON.parse(response.body)`;

  return { curl, js, python, ruby };
}

// ─── Utility components ───────────────────────────────────────────────────────

function CopyButton({ text, small }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
      }
      className={`flex-shrink-0 rounded font-medium transition ${
        small
          ? "px-2 py-0.5 text-xs bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200"
          : "px-2.5 py-1 text-xs bg-slate-700/80 text-slate-400 hover:bg-slate-600 hover:text-slate-200"
      }`}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, language }) {
  return (
    <div className="relative rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/70">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {language}
        </span>
        <div className="ml-auto">
          <CopyButton text={code} small />
        </div>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-xs font-mono text-slate-300 leading-relaxed">
        <code>{code}</code>
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
    <div className="py-2.5 border-b border-slate-800/70 last:border-0 flex flex-col gap-0.5">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-xs font-mono text-sky-300">{name}</code>
        <span className="text-[10px] text-slate-500 bg-slate-800 rounded px-1">
          {type}
        </span>
        {required && (
          <span className="text-[10px] font-bold text-red-400 bg-red-900/20 rounded px-1">
            required
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function ResponseField({ name, type, description }) {
  return (
    <div className="py-2 border-b border-slate-800/70 last:border-0 flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono text-emerald-300">{name}</code>
        <span className="text-[10px] text-slate-500 italic">{type}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function Section({ id, children }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-6">
      {children}
    </section>
  );
}

// Stable DOM id for an individual endpoint card
function epId(method, path) {
  return `ep-${method}-${path}`
    .toLowerCase()
    .replace(/[/:]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-3">
      {children}
    </h2>
  );
}

// ─── Multi-language snippet panel ────────────────────────────────────────────

const LANGS = [
  { id: "curl", label: "cURL" },
  { id: "js", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "ruby", label: "Ruby" },
];

function MultiLangSnippet({ snippets }) {
  const [active, setActive] = useState("curl");
  return (
    <div className="rounded-lg border border-slate-800 overflow-hidden">
      <div className="flex border-b border-slate-800 bg-slate-900/80">
        {LANGS.map((lang) => (
          <button
            key={lang.id}
            type="button"
            onClick={() => setActive(lang.id)}
            className={`px-3 py-2 text-xs font-medium transition border-b-2 -mb-px ${
              active === lang.id
                ? "border-sky-500 text-sky-300 bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
            }`}
          >
            {lang.label}
          </button>
        ))}
        <div className="ml-auto flex items-center pr-2">
          <CopyButton text={snippets[active]} small />
        </div>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-xs font-mono text-slate-300 leading-relaxed bg-slate-950 min-h-[80px]">
        <code>{snippets[active]}</code>
      </pre>
    </div>
  );
}

// ─── Try It live tester ──────────────────────────────────────────────────────

function ParamInput({
  label,
  value,
  required,
  placeholder,
  description,
  colorClass = "text-sky-400",
  onChange,
}) {
  return (
    <div>
      <label className="block text-[10px] text-slate-500 mb-0.5">
        <span className={`font-mono ${colorClass}`}>{label}</span>
        {required && <span className="text-red-400 ml-1">*</span>}
        {description && (
          <span className="text-slate-600 ml-1.5 font-normal">
            — {description}
          </span>
        )}
      </label>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ""}
        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-600 transition"
      />
    </div>
  );
}

function TryIt({ method, path, globalToken, bodyFields, params }) {
  const pathParams = (params || []).filter((p) => p.type === "path");
  const queryParams = (params || []).filter((p) => p.type === "query");

  const [token, setToken] = useState("");
  const [body, setBody] = useState(() =>
    Object.fromEntries(
      (bodyFields || []).map((f) => [f.name, f.defaultValue ?? ""]),
    ),
  );
  const [pathValues, setPathValues] = useState(() =>
    Object.fromEntries(pathParams.map((p) => [p.name, ""])),
  );
  const [queryValues, setQueryValues] = useState(() =>
    Object.fromEntries(queryParams.map((p) => [p.name, ""])),
  );
  const [status, setStatus] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const effectiveToken = token || globalToken || "";

  // Build the resolved URL including path substitutions and query string
  const resolvedUrl = useCallback(() => {
    let resolved = path;
    pathParams.forEach((p) => {
      const val = pathValues[p.name];
      resolved = resolved.replace(`:${p.name}`, val || `:${p.name}`);
    });
    const qs = queryParams
      .map((p) => ({ key: p.name, val: queryValues[p.name] }))
      .filter(({ val }) => val !== "")
      .map(
        ({ key, val }) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(val)}`,
      )
      .join("&");
    return `${BASE_URL}${resolved}${qs ? `?${qs}` : ""}`;
  }, [path, pathParams, queryParams, pathValues, queryValues]);

  const execute = useCallback(async () => {
    if (!effectiveToken) {
      setError("Paste an API token above to send the request.");
      return;
    }
    setLoading(true);
    setStatus(null);
    setResponse(null);
    setError(null);
    try {
      const options = {
        method: method.toUpperCase(),
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
          Accept: "application/json",
        },
      };
      const hasBody = bodyFields && bodyFields.length > 0;
      if (hasBody) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }
      const res = await fetch(resolvedUrl(), options);
      setStatus(res.status);
      try {
        const json = await res.json();
        setResponse(JSON.stringify(json, null, 2));
      } catch {
        setResponse(await res.text());
      }
    } catch (e) {
      setError(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }, [method, resolvedUrl, effectiveToken, body, bodyFields]);

  const statusColor =
    status >= 200 && status < 300
      ? "text-emerald-400"
      : status >= 400
        ? "text-red-400"
        : "text-slate-400";

  const url = resolvedUrl();
  const hasUnfilledPath = pathParams.some((p) => !pathValues[p.name]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
          API Token
        </label>
        <input
          type="text"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setError(null);
          }}
          placeholder={
            globalToken
              ? "(using global token from sidebar)"
              : "sf_your_token_here"
          }
          className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-600 transition"
        />
      </div>

      {pathParams.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Path Parameters
          </p>
          {pathParams.map((p) => (
            <ParamInput
              key={p.name}
              label={p.name}
              value={pathValues[p.name]}
              required={p.required}
              placeholder={p.placeholder || `Enter ${p.name}…`}
              description={p.description}
              colorClass="text-violet-400"
              onChange={(val) =>
                setPathValues((prev) => ({ ...prev, [p.name]: val }))
              }
            />
          ))}
        </div>
      )}

      {queryParams.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Query Parameters
          </p>
          {queryParams.map((p) => (
            <ParamInput
              key={p.name}
              label={p.name}
              value={queryValues[p.name]}
              required={p.required}
              placeholder={p.required ? "Required" : "Optional"}
              description={p.description}
              colorClass="text-amber-400"
              onChange={(val) =>
                setQueryValues((prev) => ({ ...prev, [p.name]: val }))
              }
            />
          ))}
        </div>
      )}

      {bodyFields && bodyFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Request Body
          </p>
          {bodyFields.map((f) => (
            <ParamInput
              key={f.name}
              label={f.name}
              value={body[f.name]}
              required={f.required}
              placeholder={f.placeholder || ""}
              description={f.description}
              colorClass="text-sky-400"
              onChange={(val) =>
                setBody((prev) => ({ ...prev, [f.name]: val }))
              }
            />
          ))}
        </div>
      )}

      {/* Resolved URL preview */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 flex items-start gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-0.5 flex-shrink-0">
          URL
        </span>
        <code
          className={`text-[10px] font-mono break-all leading-relaxed ${
            hasUnfilledPath ? "text-amber-500" : "text-slate-400"
          }`}
        >
          {url}
        </code>
      </div>

      <button
        type="button"
        onClick={execute}
        disabled={loading}
        className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-semibold px-4 py-2 transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Sending…
          </>
        ) : (
          `▶ Send ${method.toUpperCase()} request`
        )}
      </button>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {(status !== null || response !== null) && (
        <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/70">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Response
            </span>
            {status !== null && (
              <span className={`text-xs font-bold font-mono ${statusColor}`}>
                {status}
              </span>
            )}
            {response && (
              <div className="ml-auto">
                <CopyButton text={response} small />
              </div>
            )}
          </div>
          {response && (
            <pre className="overflow-x-auto px-4 py-3 text-xs font-mono text-slate-300 leading-relaxed max-h-64">
              <code>{response}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Endpoint card (two-panel) ────────────────────────────────────────────────

function EndpointCard({
  method,
  path,
  title,
  description,
  params,
  responseFields,
  responseExample,
  bodyFields,
  globalToken,
}) {
  const [tryItOpen, setTryItOpen] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const snippets = buildSnippets(method, path, globalToken);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap border-b border-slate-800 bg-slate-900/60">
        <Badge method={method} />
        <code className="text-sm font-mono text-slate-100">{path}</code>
        <span className="text-xs text-slate-500 hidden sm:inline">—</span>
        <span className="text-xs text-slate-400 hidden sm:inline">
          {description}
        </span>
      </div>

      {/* Two-panel body */}
      <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-slate-800">
        {/* LEFT: Docs */}
        <div className="px-5 py-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-200">{title}</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {description}
            </p>
          </div>

          {params && params.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Headers &amp; Parameters
              </p>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 divide-y divide-slate-800/60">
                {params.map((p) => (
                  <Param key={p.name} {...p} />
                ))}
              </div>
            </div>
          )}

          {bodyFields && bodyFields.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Request Body
              </p>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 divide-y divide-slate-800/60">
                {bodyFields.map((f) => (
                  <Param key={f.name} {...f} />
                ))}
              </div>
            </div>
          )}

          {responseFields && responseFields.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Response Fields
              </p>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 divide-y divide-slate-800/60">
                {responseFields.map((f) => (
                  <ResponseField key={f.name} {...f} />
                ))}
              </div>
            </div>
          )}

          {responseExample && (
            <div>
              <button
                type="button"
                onClick={() => setShowResponse((v) => !v)}
                className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition"
              >
                {showResponse ? "▾ Hide" : "▸ Show"} example response
              </button>
              {showResponse && (
                <div className="mt-2">
                  <CodeBlock language="json" code={responseExample} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Code + Try It */}
        <div className="px-5 py-5 space-y-4 bg-slate-950/20">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Code Examples
            </p>
            <MultiLangSnippet snippets={snippets} />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setTryItOpen((v) => !v)}
              className={`w-full rounded-lg border px-4 py-2.5 text-xs font-semibold transition flex items-center justify-center gap-2 ${
                tryItOpen
                  ? "border-sky-600 bg-sky-900/30 text-sky-300"
                  : "border-slate-700 bg-slate-800/40 text-slate-400 hover:border-sky-700 hover:text-sky-400"
              }`}
            >
              <span>{tryItOpen ? "▾" : "▸"}</span>
              {tryItOpen ? "Close tester" : "Try it"} — live API tester
            </button>

            {tryItOpen && (
              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <TryIt
                  method={method}
                  path={path}
                  globalToken={globalToken}
                  bodyFields={bodyFields}
                  params={params}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Endpoint data ────────────────────────────────────────────────────────────

const ENDPOINTS = {
  "endpoints-profile": {
    title: "Profile & Auth",
    description:
      "Expose the identity of the token's owner and the associated studio.",
    items: [
      {
        method: "GET",
        path: "/api/v1/me",
        title: "Get current user & studio",
        description:
          "Returns the authenticated user's profile, studio, and token metadata.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — your StudioFlow API token.",
          },
        ],
        responseFields: [
          { name: "user.id", type: "integer", description: "Unique user ID." },
          {
            name: "user.email",
            type: "string",
            description: "Email address of the token owner.",
          },
          { name: "user.name", type: "string", description: "Display name." },
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
            description: "First 8 chars of the token (safe to log).",
          },
          {
            name: "api_token.last_used_at",
            type: "ISO8601|null",
            description: "When this token was last used.",
          },
        ],
        responseExample: `{
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
}`,
      },
      {
        method: "GET",
        path: "/api/v1/studio",
        title: "Get studio details",
        description:
          "Returns details for the studio associated with the API token.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — your StudioFlow API token.",
          },
        ],
        responseFields: [
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
        ],
        responseExample: `{
  "studio": {
    "id": 7,
    "name": "Zen Flow Studio",
    "slug": "zen-flow",
    "invite_code": "ZF-8821",
    "onboarding_completed_at": "2025-11-15T10:30:00.000Z"
  }
}`,
      },
    ],
  },

  // ── PILLAR 1: Owners & Staff ──────────────────────────────────────────────
  "endpoints-owner": {
    title: "Owners & Staff",
    description:
      "Studio-wide management endpoints. Require an owner or staff role.",
    items: [
      {
        method: "GET",
        path: "/api/v1/clients",
        title: "List clients",
        description:
          "Returns all clients in the studio, ordered by name. Requires owner or staff role.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — owner or staff token.",
          },
        ],
        responseFields: [
          {
            name: "clients[].id",
            type: "integer",
            description: "Client record ID.",
          },
          {
            name: "clients[].name",
            type: "string",
            description: "Client display name.",
          },
          {
            name: "clients[].email",
            type: "string",
            description: "Contact email.",
          },
          {
            name: "clients[].phone",
            type: "string|null",
            description: "Phone number.",
          },
          {
            name: "clients[].created_at",
            type: "ISO8601",
            description: "When the client was added.",
          },
          {
            name: "meta.total",
            type: "integer",
            description: "Total number of clients returned.",
          },
        ],
        responseExample: `{
  "clients": [
    {
      "id": 101,
      "name": "Jamie Santos",
      "email": "jamie@example.com",
      "phone": "+1 555-0101",
      "created_at": "2025-09-12T08:00:00.000Z"
    },
    {
      "id": 102,
      "name": "Morgan Lee",
      "email": "morgan@example.com",
      "phone": null,
      "created_at": "2025-10-03T14:30:00.000Z"
    }
  ],
  "meta": { "total": 2 }
}`,
      },
      {
        method: "GET",
        path: "/api/v1/clients/:id",
        title: "Get a client",
        description:
          "Returns a single client with their booking count and active memberships. Requires owner or staff role.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — owner or staff token.",
          },
          {
            name: "id",
            type: "path",
            required: true,
            description: "Client ID.",
          },
        ],
        responseFields: [
          {
            name: "client.id",
            type: "integer",
            description: "Client record ID.",
          },
          { name: "client.name", type: "string", description: "Display name." },
          {
            name: "client.email",
            type: "string",
            description: "Contact email.",
          },
          {
            name: "client.phone",
            type: "string|null",
            description: "Phone number.",
          },
          {
            name: "client.bookings_count",
            type: "integer",
            description: "Number of non-archived bookings.",
          },
          {
            name: "client.memberships[]",
            type: "array",
            description: "Summary of all memberships (any status).",
          },
        ],
        responseExample: `{
  "client": {
    "id": 101,
    "name": "Jamie Santos",
    "email": "jamie@example.com",
    "phone": "+1 555-0101",
    "created_at": "2025-09-12T08:00:00.000Z",
    "bookings_count": 14,
    "memberships": [
      {
        "id": 5,
        "status": "active",
        "started_at": "2026-01-01",
        "ends_at": "2026-12-31"
      }
    ]
  }
}`,
      },
      {
        method: "GET",
        path: "/api/v1/sessions",
        title: "List class sessions",
        description:
          "Returns upcoming class sessions for the studio. Optionally filtered by date range. Requires owner or staff role.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — owner or staff token.",
          },
          {
            name: "from",
            type: "query",
            required: false,
            description: "ISO8601 start date (default: today).",
          },
          {
            name: "to",
            type: "query",
            required: false,
            description: "ISO8601 end date.",
          },
          {
            name: "page",
            type: "query",
            required: false,
            description: "Page number (default: 1).",
          },
          {
            name: "per_page",
            type: "query",
            required: false,
            description: "Results per page (default: 25, max: 100).",
          },
        ],
        responseFields: [
          {
            name: "sessions[].id",
            type: "integer",
            description: "Session ID.",
          },
          {
            name: "sessions[].start_time",
            type: "ISO8601",
            description: "When the session starts.",
          },
          {
            name: "sessions[].end_time",
            type: "ISO8601",
            description: "When the session ends (computed if not set).",
          },
          {
            name: "sessions[].capacity",
            type: "integer",
            description: "Max number of spots.",
          },
          {
            name: "sessions[].seats_available",
            type: "integer",
            description: "Open spots remaining.",
          },
          {
            name: "sessions[].room",
            type: "string|null",
            description: "Room / location label.",
          },
          {
            name: "sessions[].class_template.title",
            type: "string",
            description: "Class type name.",
          },
          {
            name: "sessions[].instructor",
            type: "object|null",
            description: "Instructor id and name, if assigned.",
          },
          {
            name: "meta.total",
            type: "integer",
            description: "Total matching sessions.",
          },
        ],
        responseExample: `{
  "sessions": [
    {
      "id": 200,
      "start_time": "2026-03-10T09:00:00.000Z",
      "end_time": "2026-03-10T09:50:00.000Z",
      "room": "Studio A",
      "capacity": 12,
      "seats_available": 5,
      "bundle_enabled": true,
      "bundle_spots": 4,
      "class_template": { "id": 3, "title": "Morning Flow" },
      "instructor": { "id": 8, "name": "Sam Patel" }
    }
  ],
  "meta": { "total": 1, "page": 1, "per_page": 25 }
}`,
      },
      {
        method: "GET",
        path: "/api/v1/sessions/:id",
        title: "Get session with bookings",
        description:
          "Returns a class session including its full booking roster. Requires owner or staff role.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — owner or staff token.",
          },
          {
            name: "id",
            type: "path",
            required: true,
            description: "Session ID.",
          },
        ],
        responseFields: [
          {
            name: "session.*",
            type: "object",
            description: "All fields from the list response.",
          },
          {
            name: "session.bookings[].id",
            type: "integer",
            description: "Booking ID.",
          },
          {
            name: "session.bookings[].slug",
            type: "string",
            description: "Short unique booking code.",
          },
          {
            name: "session.bookings[].status",
            type: "string",
            description: "booked | waitlisted | cancelled | no_show.",
          },
          {
            name: "session.bookings[].paid",
            type: "boolean",
            description: "Whether payment was collected.",
          },
          {
            name: "session.bookings[].client_id",
            type: "integer",
            description: "Client ID.",
          },
          {
            name: "session.bookings[].client_name",
            type: "string",
            description: "Client display name.",
          },
        ],
        responseExample: `{
  "session": {
    "id": 200,
    "start_time": "2026-03-10T09:00:00.000Z",
    "end_time": "2026-03-10T09:50:00.000Z",
    "capacity": 12,
    "seats_available": 5,
    "class_template": { "id": 3, "title": "Morning Flow" },
    "instructor": { "id": 8, "name": "Sam Patel" },
    "bookings": [
      {
        "id": 401,
        "slug": "a1b2c3d4",
        "status": "booked",
        "paid": true,
        "client_id": 101,
        "client_name": "Jamie Santos",
        "created_at": "2026-03-05T11:00:00.000Z"
      }
    ]
  }
}`,
      },
    ],
  },

  // ── PILLAR 2: Instructors ─────────────────────────────────────────────────
  "endpoints-instructor": {
    title: "Instructors",
    description:
      "Endpoints scoped to the authenticated instructor's own sessions and pay history.",
    items: [
      {
        method: "GET",
        path: "/api/v1/instructor/sessions",
        title: "My upcoming sessions",
        description:
          "Returns class sessions assigned to the current instructor. Accepts the same from / to date filters as the owner sessions list.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — instructor, owner, or staff token.",
          },
          {
            name: "from",
            type: "query",
            required: false,
            description: "ISO8601 start date (default: today).",
          },
          {
            name: "to",
            type: "query",
            required: false,
            description: "ISO8601 end date.",
          },
        ],
        responseFields: [
          {
            name: "sessions[].id",
            type: "integer",
            description: "Session ID.",
          },
          {
            name: "sessions[].start_time",
            type: "ISO8601",
            description: "Session start.",
          },
          {
            name: "sessions[].end_time",
            type: "ISO8601",
            description: "Session end.",
          },
          {
            name: "sessions[].title",
            type: "string",
            description: "Class template title.",
          },
          {
            name: "sessions[].room",
            type: "string|null",
            description: "Room / space label.",
          },
          {
            name: "sessions[].capacity",
            type: "integer",
            description: "Max attendees.",
          },
          {
            name: "sessions[].seats_available",
            type: "integer",
            description: "Remaining open spots.",
          },
          {
            name: "meta.total",
            type: "integer",
            description: "Total sessions returned.",
          },
        ],
        responseExample: `{
  "sessions": [
    {
      "id": 200,
      "start_time": "2026-03-10T09:00:00.000Z",
      "end_time": "2026-03-10T09:50:00.000Z",
      "title": "Morning Flow",
      "room": "Studio A",
      "capacity": 12,
      "seats_available": 5
    }
  ],
  "meta": { "total": 1 }
}`,
      },
      {
        method: "GET",
        path: "/api/v1/instructor/sessions/:id/bookings",
        title: "Session roster",
        description:
          "Returns the booked and waitlisted clients for one of the instructor's sessions.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — instructor, owner, or staff token.",
          },
          {
            name: "id",
            type: "path",
            required: true,
            description: "Session ID (must be assigned to you).",
          },
        ],
        responseFields: [
          { name: "session.id", type: "integer", description: "Session ID." },
          {
            name: "session.start_time",
            type: "ISO8601",
            description: "Session start.",
          },
          {
            name: "session.title",
            type: "string",
            description: "Class title.",
          },
          {
            name: "bookings[].id",
            type: "integer",
            description: "Booking ID.",
          },
          {
            name: "bookings[].status",
            type: "string",
            description: "booked | waitlisted.",
          },
          {
            name: "bookings[].client_name",
            type: "string",
            description: "Attendee's display name.",
          },
          {
            name: "bookings[].client_id",
            type: "integer",
            description: "Client record ID.",
          },
        ],
        responseExample: `{
  "session": {
    "id": 200,
    "start_time": "2026-03-10T09:00:00.000Z",
    "title": "Morning Flow"
  },
  "bookings": [
    {
      "id": 401,
      "slug": "a1b2c3d4",
      "status": "booked",
      "client_name": "Jamie Santos",
      "client_id": 101
    },
    {
      "id": 402,
      "slug": "e5f6g7h8",
      "status": "waitlisted",
      "client_name": "Morgan Lee",
      "client_id": 102
    }
  ]
}`,
      },
      {
        method: "GET",
        path: "/api/v1/instructor/payouts",
        title: "My payout history",
        description:
          "Returns all instructor payouts for the authenticated instructor, most recent first.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — instructor, owner, or staff token.",
          },
        ],
        responseFields: [
          {
            name: "payouts[].id",
            type: "integer",
            description: "Payout record ID.",
          },
          {
            name: "payouts[].week_start",
            type: "date",
            description: "Monday of the pay week.",
          },
          {
            name: "payouts[].week_end",
            type: "date",
            description: "Sunday of the pay week.",
          },
          {
            name: "payouts[].status",
            type: "string",
            description: "draft | approved | paid.",
          },
          {
            name: "payouts[].currency",
            type: "string",
            description: "ISO 4217 currency code (cad, usd).",
          },
          {
            name: "payouts[].gross_cents",
            type: "integer",
            description: "Total revenue for the week in cents.",
          },
          {
            name: "payouts[].instructor_earnings_cents",
            type: "integer",
            description: "Instructor's share in cents.",
          },
          {
            name: "payouts[].studio_cut_cents",
            type: "integer",
            description: "Studio's share in cents.",
          },
          {
            name: "payouts[].paid_at",
            type: "ISO8601|null",
            description: "When payment was disbursed.",
          },
          {
            name: "payouts[].paid_method",
            type: "string|null",
            description: "e-transfer, stripe, cash, etc.",
          },
        ],
        responseExample: `{
  "payouts": [
    {
      "id": 55,
      "week_start": "2026-02-23",
      "week_end": "2026-03-01",
      "status": "paid",
      "currency": "cad",
      "gross_cents": 120000,
      "instructor_earnings_cents": 60000,
      "studio_cut_cents": 60000,
      "paid_at": "2026-03-03T10:00:00.000Z",
      "paid_method": "e-transfer"
    }
  ],
  "meta": { "total": 1 }
}`,
      },
    ],
  },

  // ── PILLAR 3: Clients (self-service) ──────────────────────────────────────
  "endpoints-client": {
    title: "Clients",
    description:
      "Self-service endpoints for client-role users to view their own data.",
    items: [
      {
        method: "GET",
        path: "/api/v1/client/bookings",
        title: "My bookings",
        description:
          "Returns all non-archived bookings for the authenticated client, most recent first.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — client token.",
          },
        ],
        responseFields: [
          {
            name: "bookings[].id",
            type: "integer",
            description: "Booking ID.",
          },
          {
            name: "bookings[].slug",
            type: "string",
            description: "Short unique booking code.",
          },
          {
            name: "bookings[].status",
            type: "string",
            description: "booked | waitlisted | cancelled | no_show.",
          },
          {
            name: "bookings[].paid",
            type: "boolean",
            description: "Whether the booking has been paid.",
          },
          {
            name: "bookings[].price_cents",
            type: "integer",
            description: "Amount charged in cents.",
          },
          {
            name: "bookings[].session.id",
            type: "integer",
            description: "Class session ID.",
          },
          {
            name: "bookings[].session.start_time",
            type: "ISO8601",
            description: "Session start time.",
          },
          {
            name: "bookings[].session.end_time",
            type: "ISO8601",
            description: "Session end time.",
          },
          {
            name: "bookings[].session.title",
            type: "string",
            description: "Class name.",
          },
          {
            name: "meta.total",
            type: "integer",
            description: "Total bookings returned.",
          },
        ],
        responseExample: `{
  "bookings": [
    {
      "id": 401,
      "slug": "a1b2c3d4",
      "status": "booked",
      "paid": true,
      "price_cents": 2500,
      "session": {
        "id": 200,
        "start_time": "2026-03-10T09:00:00.000Z",
        "end_time": "2026-03-10T09:50:00.000Z",
        "title": "Morning Flow"
      },
      "created_at": "2026-03-05T11:00:00.000Z"
    }
  ],
  "meta": { "total": 1 }
}`,
      },
      {
        method: "GET",
        path: "/api/v1/client/memberships",
        title: "My memberships",
        description:
          "Returns all membership records for the authenticated client including plan details.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — client token.",
          },
        ],
        responseFields: [
          {
            name: "memberships[].id",
            type: "integer",
            description: "Membership record ID.",
          },
          {
            name: "memberships[].status",
            type: "string",
            description: "active | cancelled | expired.",
          },
          {
            name: "memberships[].started_at",
            type: "date",
            description: "Membership start date.",
          },
          {
            name: "memberships[].ends_at",
            type: "date|null",
            description: "Membership end date.",
          },
          {
            name: "memberships[].cancelled_at",
            type: "ISO8601|null",
            description: "When cancelled, if applicable.",
          },
          {
            name: "memberships[].price_cents",
            type: "integer|null",
            description: "Override price in cents.",
          },
          {
            name: "memberships[].currency",
            type: "string",
            description: "ISO 4217 currency code.",
          },
          {
            name: "memberships[].plan.id",
            type: "integer",
            description: "Membership plan ID.",
          },
          {
            name: "memberships[].plan.name",
            type: "string",
            description: "Plan name.",
          },
          {
            name: "memberships[].plan.description",
            type: "string|null",
            description: "Plan description.",
          },
        ],
        responseExample: `{
  "memberships": [
    {
      "id": 5,
      "status": "active",
      "started_at": "2026-01-01",
      "ends_at": "2026-12-31",
      "cancelled_at": null,
      "price_cents": 15000,
      "currency": "cad",
      "plan": {
        "id": 2,
        "name": "Unlimited Monthly",
        "description": "Unlimited classes, priority booking included."
      }
    }
  ],
  "meta": { "total": 1 }
}`,
      },
      {
        method: "GET",
        path: "/api/v1/client/bundle_purchases",
        title: "My bundles",
        description:
          "Returns all class-bundle purchases for the authenticated client with remaining credit balance.",
        params: [
          {
            name: "Authorization",
            type: "header",
            required: true,
            description: "Bearer <token> — client token.",
          },
        ],
        responseFields: [
          {
            name: "bundle_purchases[].id",
            type: "integer",
            description: "Purchase record ID.",
          },
          {
            name: "bundle_purchases[].status",
            type: "string",
            description: "succeeded | refunded | pending.",
          },
          {
            name: "bundle_purchases[].credits_total",
            type: "integer",
            description: "Total credits bought.",
          },
          {
            name: "bundle_purchases[].credits_remaining",
            type: "integer",
            description: "Credits still available.",
          },
          {
            name: "bundle_purchases[].price_cents",
            type: "integer",
            description: "Amount paid in cents.",
          },
          {
            name: "bundle_purchases[].currency",
            type: "string",
            description: "ISO 4217 currency code.",
          },
          {
            name: "bundle_purchases[].product.id",
            type: "integer",
            description: "Bundle product ID.",
          },
          {
            name: "bundle_purchases[].product.title",
            type: "string",
            description: "Bundle product name.",
          },
          {
            name: "meta.total",
            type: "integer",
            description: "Total purchases returned.",
          },
        ],
        responseExample: `{
  "bundle_purchases": [
    {
      "id": 77,
      "status": "succeeded",
      "credits_total": 10,
      "credits_remaining": 7,
      "price_cents": 20000,
      "currency": "cad",
      "created_at": "2026-02-01T09:00:00.000Z",
      "product": {
        "id": 4,
        "title": "10-Class Pack — Morning Flow"
      }
    }
  ],
  "meta": { "total": 1 }
}`,
      },
    ],
  },
};

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "errors", label: "Errors" },
  ...Object.entries(ENDPOINTS).map(([sectionId, section]) => ({
    id: sectionId,
    label: section.title,
    children: section.items.map((ep) => ({
      id: epId(ep.method, ep.path),
      label: ep.path,
      method: ep.method,
    })),
  })),
];

// ─── Main component ───────────────────────────────────────────────────────────

const LS_PREFIX = "studioflow_token_";

function loadSavedTokens() {
  const saved = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(LS_PREFIX)) {
      saved[key.slice(LS_PREFIX.length)] = localStorage.getItem(key);
    }
  }
  return saved;
}

export default function ApiDocs() {
  const [activeNav, setActiveNav] = useState("overview");
  const [globalToken, setGlobalToken] = useState("");
  const [sessionTokens, setSessionTokens] = useState(null); // null = loading, [] = none
  const [savedTokens, setSavedTokens] = useState(loadSavedTokens); // { prefix: rawToken }
  const [rememberToken, setRememberToken] = useState(false);

  // Detect logged-in session, fetch token hints, auto-fill if a saved match exists
  useEffect(() => {
    const jwt = localStorage.getItem("pilates_token");
    const request = jwt
      ? fetch(`${BASE_URL}/api/tokens`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
            Accept: "application/json",
          },
        })
          .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
          .then(({ api_tokens }) => (api_tokens || []).filter((t) => t.active))
          .catch(() => [])
      : Promise.resolve([]);
    request.then((tokens) => {
      setSessionTokens(tokens);
      // Auto-fill with the first saved token that matches an active session token
      const saved = loadSavedTokens();
      const match = tokens.find((t) => saved[t.prefix]);
      if (match) {
        setGlobalToken(saved[match.prefix]);
        setRememberToken(true);
      }
    });
  }, []);

  // Persist / remove token from localStorage when user toggles Remember
  const handleRememberToggle = useCallback(
    (checked) => {
      setRememberToken(checked);
      const prefix = globalToken.slice(0, 8);
      if (!prefix) return;
      if (checked) {
        localStorage.setItem(`${LS_PREFIX}${prefix}`, globalToken);
        setSavedTokens((prev) => ({ ...prev, [prefix]: globalToken }));
      } else {
        localStorage.removeItem(`${LS_PREFIX}${prefix}`);
        setSavedTokens((prev) => {
          const n = { ...prev };
          delete n[prefix];
          return n;
        });
      }
    },
    [globalToken],
  );

  // Save immediately when token changes if Remember is already checked
  const handleTokenChange = useCallback(
    (raw) => {
      setGlobalToken(raw);
      if (rememberToken && raw.length >= 8) {
        const prefix = raw.slice(0, 8);
        localStorage.setItem(`${LS_PREFIX}${prefix}`, raw);
        setSavedTokens((prev) => ({ ...prev, [prefix]: raw }));
      }
    },
    [rememberToken],
  );

  const scrollingRef = useRef(false);

  // Scrollspy: observe all section + endpoint anchor ids
  useEffect(() => {
    const allIds = NAV_ITEMS.flatMap((item) =>
      item.children ? [item.id, ...item.children.map((c) => c.id)] : [item.id],
    );

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingRef.current) return; // suppress while click-scroll is settling
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveNav(entry.target.id);
          }
        });
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 },
    );

    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    setActiveNav(id);
    scrollingRef.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    // Allow observer to resume after scroll settles (~900ms)
    setTimeout(() => {
      scrollingRef.current = false;
    }, 900);
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-300">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 flex-col gap-2 border-r border-slate-800 px-4 py-8 sticky top-0 h-screen overflow-y-auto">
        <div className="mb-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-sky-400/80 mb-0.5">
            Studio<strong className="text-slate-300">Flow</strong>
          </div>
          <p className="text-xs text-slate-500">API Reference · v1</p>
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const childActive = item.children?.some((c) => c.id === activeNav);
            const parentActive = activeNav === item.id || childActive;
            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => scrollTo(item.id)}
                  className={`w-full text-left rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    parentActive
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
                {item.children && (
                  <div className="ml-3 pl-2.5 border-l border-slate-800 mt-0.5 mb-1 flex flex-col gap-0.5">
                    {item.children.map((child) => {
                      const methodColor =
                        {
                          GET: "text-sky-500",
                          POST: "text-green-500",
                          PATCH: "text-amber-500",
                          DELETE: "text-red-400",
                        }[child.method] ?? "text-slate-500";
                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => scrollTo(child.id)}
                          className={`w-full text-left rounded px-2 py-1 text-[10px] font-mono transition flex items-center gap-1.5 leading-tight ${
                            activeNav === child.id
                              ? "bg-slate-800/80 text-slate-200"
                              : "text-slate-500 hover:bg-slate-800/40 hover:text-slate-300"
                          }`}
                        >
                          <span
                            className={`font-bold flex-shrink-0 ${methodColor}`}
                          >
                            {child.method}
                          </span>
                          <span className="truncate">
                            {child.label.replace(/^\/api\/v\d+/, "")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="mt-6 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            API Token
          </p>

          {/* Session token hints */}
          {sessionTokens === null && (
            <p className="text-[10px] text-slate-600">Detecting session…</p>
          )}

          {sessionTokens !== null && sessionTokens.length > 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 divide-y divide-slate-800 overflow-hidden">
              {sessionTokens.map((t) => {
                const saved = savedTokens[t.prefix];
                const isActive =
                  globalToken && globalToken.startsWith(t.prefix);
                return (
                  <div
                    key={t.id}
                    className={`px-3 py-2 ${isActive ? "bg-emerald-950/40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-300 truncate">
                          {t.name}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                          <span className="text-sky-500">{t.prefix}</span>
                          {"…"}
                          {t.last_used_at
                            ? ` · used ${new Date(t.last_used_at).toLocaleDateString()}`
                            : " · never used"}
                        </p>
                      </div>
                      {saved ? (
                        isActive ? (
                          <span className="flex-shrink-0 text-[10px] text-emerald-400 font-medium mt-0.5">
                            Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setGlobalToken(saved);
                              setRememberToken(true);
                            }}
                            className="flex-shrink-0 text-[10px] text-sky-400 hover:text-sky-300 font-medium mt-0.5 transition"
                          >
                            Use ↗
                          </button>
                        )
                      ) : (
                        <span className="flex-shrink-0 text-[10px] text-slate-600 mt-0.5">
                          Paste below
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {sessionTokens !== null && sessionTokens.length === 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                No active tokens found.{" "}
                <Link
                  to="/owner/api-tokens"
                  className="text-sky-400 hover:underline"
                >
                  Generate one
                </Link>{" "}
                to try the API.
              </p>
            </div>
          )}

          <input
            type="text"
            value={globalToken}
            onChange={(e) => handleTokenChange(e.target.value)}
            placeholder="Paste your token here…"
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-[11px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-sky-600 transition"
          />

          {globalToken && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <p className="text-[10px] text-emerald-500">
                  Active — testers and snippets updated.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberToken}
                  onChange={(e) => handleRememberToggle(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-600 focus:ring-offset-0 h-3 w-3"
                />
                <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition">
                  Remember on this device
                </span>
              </label>
              {rememberToken && (
                <p className="text-[10px] text-amber-600 leading-relaxed">
                  Token saved in browser storage. Avoid on shared computers.
                </p>
              )}
            </>
          )}
          {!globalToken && (
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Pre-fills all Try It testers and code snippets.
            </p>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-800">
          <Link
            to="/owner/api-tokens"
            className="text-xs text-sky-400 hover:underline"
          >
            ← Manage tokens
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-4 sm:px-8 xl:px-12 py-10 space-y-16 max-w-[1400px]">
        {/* Hero */}
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-900/30 border border-sky-700 px-3 py-1 text-xs text-sky-300 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            v1 · REST · JSON
          </div>
          <h1 className="text-3xl font-bold text-slate-100">StudioFlow API</h1>
          <p className="text-slate-400">
            The StudioFlow REST API lets studio owners build integrations,
            automate workflows, and access their studio&apos;s data
            programmatically. All endpoints require an API token.
          </p>
          <div className="flex gap-3 pt-1 flex-wrap">
            <Link
              to="/owner/api-tokens"
              className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition"
            >
              Get an API token
            </Link>
            <span className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-2 text-xs font-mono text-slate-500">
              {BASE_URL}
            </span>
          </div>
        </div>

        {/* Overview */}
        <Section id="overview">
          <SectionTitle>Overview</SectionTitle>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Base URL", value: BASE_URL, mono: true },
              { label: "Protocol", value: "HTTPS only", mono: false },
              { label: "Auth", value: "Bearer token", mono: false },
              { label: "Format", value: "JSON", mono: false },
            ].map(({ label, value, mono }) => (
              <div
                key={label}
                className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3"
              >
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                  {label}
                </p>
                <p
                  className={`text-sm text-slate-200 ${mono ? "font-mono break-all text-xs" : ""}`}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          <CodeBlock
            language="shell"
            code={`# All requests must include your token\ncurl ${BASE_URL}/api/v1/me \\\n  -H "Authorization: Bearer sf_your_token_here"`}
          />
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
          <CodeBlock
            language="http"
            code="Authorization: Bearer sf_xxxxxxxxxxxxxxxx"
          />
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
                Store it securely (environment variables, secrets manager) and
                never commit it to version control.
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
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-20">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Meaning
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[
                  ["200", "OK", "Request succeeded."],
                  ["201", "Created", "Resource was created successfully."],
                  [
                    "400",
                    "Bad Request",
                    "Invalid parameters or malformed request.",
                  ],
                  ["401", "Unauthorized", "Missing or invalid API token."],
                  ["403", "Forbidden", "Token is valid but lacks permission."],
                  [
                    "404",
                    "Not Found",
                    "The requested resource does not exist.",
                  ],
                  [
                    "422",
                    "Unprocessable",
                    "Validation error on the submitted data.",
                  ],
                  ["500", "Server Error", "Something went wrong on our end."],
                ].map(([code, label, meaning]) => (
                  <tr
                    key={code}
                    className="bg-slate-950/30 hover:bg-slate-900/40 transition"
                  >
                    <td className="px-4 py-2.5">
                      <code className="font-mono text-slate-300 text-xs">
                        {code}
                      </code>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-slate-300 font-medium text-xs">
                        {label}
                      </span>
                      <span className="text-slate-500 text-xs ml-2">
                        — {meaning}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CodeBlock
            language="json"
            code={
              '// Error response shape\n{\n  "error": "Invalid or revoked API token"\n}'
            }
          />
        </Section>

        {/* Endpoint sections */}
        {Object.entries(ENDPOINTS).map(([sectionId, section]) => (
          <Section key={sectionId} id={sectionId}>
            <SectionTitle>{section.title}</SectionTitle>
            {section.description && (
              <p className="text-sm text-slate-400">{section.description}</p>
            )}
            <div className="space-y-6">
              {section.items.map((ep) => (
                <div
                  key={ep.path + ep.method}
                  id={epId(ep.method, ep.path)}
                  className="scroll-mt-24"
                >
                  <EndpointCard {...ep} globalToken={globalToken} />
                </div>
              ))}
            </div>
          </Section>
        ))}

        {/* Footer */}
        <footer className="border-t border-slate-800 pt-8 pb-16 text-xs text-slate-600 space-y-1">
          <p>StudioFlow API · v1 · REST · JSON</p>
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
