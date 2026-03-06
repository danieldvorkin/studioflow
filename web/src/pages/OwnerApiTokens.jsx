import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { API_TOKENS } from "../apollo/queries";
import { CREATE_API_TOKEN, REVOKE_API_TOKEN } from "../apollo/mutations";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="ml-2 rounded px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function TokenBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-300 border border-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-300 border border-red-800">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
      Revoked
    </span>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OwnerApiTokens() {
  useDocumentTitle("API Tokens");
  const { user } = useAuth();
  const isOwner =
    user?.role === 0 || user?.roleName === "owner" || user?.godmode;

  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState(null); // { rawToken, name }
  const [formError, setFormError] = useState("");
  const [revokeConfirm, setRevokeConfirm] = useState(null); // token id

  const { data, loading, refetch } = useQuery(API_TOKENS, { skip: !isOwner });

  const [createToken, { loading: creating }] = useMutation(CREATE_API_TOKEN, {
    onCompleted: (res) => {
      const result = res?.createApiToken;
      if (result?.errors?.length) {
        setFormError(result.errors[0]);
        return;
      }
      setCreatedToken({
        rawToken: result.rawToken,
        name: result.apiToken.name,
      });
      setNewTokenName("");
      setFormError("");
      refetch();
    },
    onError: (err) => setFormError(err.message),
  });

  const [revokeToken, { loading: revoking }] = useMutation(REVOKE_API_TOKEN, {
    onCompleted: (res) => {
      const result = res?.revokeApiToken;
      if (result?.errors?.length) return;
      setRevokeConfirm(null);
      refetch();
    },
  });

  if (!isOwner) return <Navigate to="/dashboard" replace />;

  const tokens = data?.apiTokens ?? [];

  const handleCreate = (e) => {
    e.preventDefault();
    const name = newTokenName.trim();
    if (!name) {
      setFormError("Token name is required");
      return;
    }
    setFormError("");
    createToken({ variables: { name } });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">API Tokens</h1>
        <p className="mt-1 text-sm text-slate-400">
          Generate long-lived tokens for programmatic access to your
          studio&apos;s data. Tokens are owner-scoped and must be kept secret.{" "}
          <a href="/api-docs" className="text-sky-400 hover:underline">
            View API documentation →
          </a>
        </p>
      </div>

      {/* Newly created token banner */}
      {createdToken && (
        <div className="rounded-xl border border-amber-600 bg-amber-950/40 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-300">
                ⚠ Token created — copy it now
              </p>
              <p className="text-xs text-amber-400/80 mt-0.5">
                This secret will not be shown again. Save it somewhere secure.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreatedToken(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Dismiss
            </button>
          </div>
          <div className="rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 flex items-center justify-between gap-3">
            <code className="break-all text-sm text-amber-200 font-mono">
              {createdToken.rawToken}
            </code>
            <CopyButton text={createdToken.rawToken} />
          </div>
          <p className="text-xs text-slate-400">
            Use it as:{" "}
            <code className="text-slate-300">
              Authorization: Bearer {createdToken.rawToken}
            </code>
          </p>
        </div>
      )}

      {/* Create form */}
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <h2 className="text-base font-semibold text-slate-200 mb-4">
          Generate new token
        </h2>
        <form
          onSubmit={handleCreate}
          className="flex items-end gap-3 flex-wrap"
        >
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="token-name"
              className="block text-xs font-medium text-slate-400 mb-1.5"
            >
              Token name
            </label>
            <input
              id="token-name"
              type="text"
              placeholder="e.g. My dashboard script"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            {formError && (
              <p className="mt-1 text-xs text-red-400">{formError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60 transition"
          >
            {creating ? "Generating…" : "Generate token"}
          </button>
        </form>
      </div>

      {/* Token list */}
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-900/40">
          <h2 className="text-base font-semibold text-slate-200">
            Your tokens
            {tokens.length > 0 && (
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({tokens.length})
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Loading…
          </div>
        ) : tokens.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-slate-500">No tokens yet.</p>
            <p className="mt-1 text-xs text-slate-600">
              Generate your first token above to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {tokens.map((tok) => (
              <li
                key={tok.id}
                className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-200 text-sm truncate">
                      {tok.name}
                    </span>
                    <TokenBadge active={tok.active} />
                  </div>
                  <div className="flex gap-4 flex-wrap text-xs text-slate-500">
                    <span>
                      Prefix:{" "}
                      <code className="text-slate-400 font-mono">
                        {tok.prefix}…
                      </code>
                    </span>
                    <span>Created {fmtDate(tok.createdAt)}</span>
                    <span>Last used: {fmtDateTime(tok.lastUsedAt)}</span>
                    {tok.expiresAt && (
                      <span>Expires {fmtDate(tok.expiresAt)}</span>
                    )}
                    {tok.revokedAt && (
                      <span className="text-red-400">
                        Revoked {fmtDate(tok.revokedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {tok.active && (
                  <div>
                    {revokeConfirm === tok.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Revoke?</span>
                        <button
                          type="button"
                          onClick={() =>
                            revokeToken({ variables: { id: tok.id } })
                          }
                          disabled={revoking}
                          className="rounded px-2.5 py-1 text-xs font-semibold bg-red-700 text-white hover:bg-red-600 disabled:opacity-60 transition"
                        >
                          Yes, revoke
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevokeConfirm(null)}
                          className="rounded px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRevokeConfirm(tok.id)}
                        className="rounded px-3 py-1.5 text-xs font-medium border border-slate-600 text-slate-400 hover:border-red-600 hover:text-red-400 transition"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Security note */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 text-sm text-slate-400 space-y-1">
        <p className="font-medium text-slate-300">Security reminders</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>
            Tokens never expire by default — revoke them when no longer needed.
          </li>
          <li>
            Never expose tokens in client-side code, git repositories, or logs.
          </li>
          <li>
            Each token is scoped to your studio and can read all studio data.
          </li>
          <li>
            Revoked tokens are permanently disabled and cannot be re-activated.
          </li>
        </ul>
      </div>
    </div>
  );
}
