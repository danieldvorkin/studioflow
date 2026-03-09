import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import { useAuth } from "../../auth/AuthProvider";
import { STUDIO_SUBSCRIPTIONS, STUDIOS } from "../../apollo/queries";
import { UPSERT_STUDIO_SUBSCRIPTION } from "../../apollo/mutations";
import { useToast } from "../../components/shared/ToastProvider";

const TIER_LABELS = { basic: "Basic", premium: "Premium" };
const TIER_PRICES = { basic: "$150 CAD/mo", premium: "$300 CAD/mo" };
const STATUS_COLORS = {
  active: "bg-green-900/60 text-green-300 border border-green-700",
  trialing: "bg-sky-900/60 text-sky-300 border border-sky-700",
  past_due: "bg-amber-900/60 text-amber-300 border border-amber-700",
  cancelled: "bg-red-900/60 text-red-300 border border-red-700",
  suspended: "bg-slate-800 text-slate-400 border border-slate-600",
};
const TIER_COLORS = {
  basic: "bg-slate-800 text-slate-300 border border-slate-600",
  premium: "bg-purple-900/60 text-purple-300 border border-purple-700",
};

function Badge({ label, colorClass }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}
    >
      {label}
    </span>
  );
}

function EditModal({ studio, subscription, onClose, onSaved }) {
  const { addToast } = useToast();
  const [tier, setTier] = useState(subscription?.tier || "basic");
  const [status, setStatus] = useState(subscription?.status || "trialing");
  const [stripeCustomerId, setStripeCustomerId] = useState(
    subscription?.stripeCustomerId || "",
  );
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState(
    subscription?.stripeSubscriptionId || "",
  );
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(
    subscription?.currentPeriodEnd
      ? subscription.currentPeriodEnd.slice(0, 10)
      : "",
  );
  const [notes, setNotes] = useState(subscription?.notes || "");
  const [saving, setSaving] = useState(false);

  const [upsert] = useMutation(UPSERT_STUDIO_SUBSCRIPTION, {
    refetchQueries: [{ query: STUDIO_SUBSCRIPTIONS }],
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await upsert({
        variables: {
          studioId: studio.id,
          tier,
          status,
          stripeCustomerId: stripeCustomerId || undefined,
          stripeSubscriptionId: stripeSubscriptionId || undefined,
          currentPeriodEnd: currentPeriodEnd
            ? new Date(currentPeriodEnd).toISOString()
            : undefined,
          notes: notes || "",
        },
      });
      const errs = data?.upsertStudioSubscription?.errors || [];
      if (errs.length > 0) {
        addToast(errs.join(", "), "error");
      } else {
        addToast("Subscription updated", "success");
        onSaved();
      }
    } catch (e) {
      addToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              {studio.name}
            </h2>
            {studio.slug && (
              <p className="mt-0.5 text-xs text-slate-400">
                {studio.slug}.yourdomain.com
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Tier
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="basic">Basic — $150 CAD/mo</option>
                <option value="premium">Premium — $300 CAD/mo</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="past_due">Past due</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Current period end
            </label>
            <input
              type="date"
              value={currentPeriodEnd}
              onChange={(e) => setCurrentPeriodEnd(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Stripe customer ID (platform)
            </label>
            <input
              type="text"
              value={stripeCustomerId}
              onChange={(e) => setStripeCustomerId(e.target.value)}
              placeholder="cus_..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Stripe subscription ID (platform)
            </label>
            <input
              type="text"
              value={stripeSubscriptionId}
              onChange={(e) => setStripeSubscriptionId(e.target.value)}
              placeholder="sub_..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Internal notes..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GodmodeSubscriptions() {
  const auth = useAuth();
  const user = auth.user;

  const roleName = (user?.roleName || "").toString().toLowerCase();
  const isGodmode = user?.godmode === true || roleName === "godmode";

  const [editTarget, setEditTarget] = useState(null); // { studio, subscription }

  const { data: subsData, loading: subsLoading } = useQuery(
    STUDIO_SUBSCRIPTIONS,
    {
      skip: !isGodmode,
      fetchPolicy: "cache-and-network",
    },
  );
  const { data: studiosData, loading: studiosLoading } = useQuery(STUDIOS, {
    skip: !isGodmode,
    fetchPolicy: "cache-and-network",
  });

  if (!user || !isGodmode) return <Navigate to="/dashboard" replace />;

  const loading = subsLoading || studiosLoading;
  const studios = studiosData?.studios || [];
  const subscriptions = subsData?.studioSubscriptions || [];

  const subByStudioId = Object.fromEntries(
    subscriptions.map((s) => [String(s.studioId), s]),
  );

  const rows = studios.map((studio) => ({
    studio,
    subscription: subByStudioId[String(studio.id)] || null,
  }));

  const totals = {
    total: rows.length,
    active: subscriptions.filter((s) => s.active).length,
    mrr: subscriptions
      .filter((s) => s.active)
      .reduce((sum, s) => sum + (s.priceCad || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-white">
          Platform Subscriptions
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage all studio owners and their StudioFlow subscriptions.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total studios", value: totals.total },
          { label: "Active subscriptions", value: totals.active },
          { label: "MRR", value: `$${totals.mrr.toLocaleString()} CAD` },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-700 bg-slate-900 p-4"
          >
            <p className="text-xs font-medium text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Subscriptions table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead>
            <tr className="text-left text-sm font-semibold uppercase tracking-widest text-sky-400">
              <th className="px-4 py-3">Studio</th>
              <th className="px-4 py-3">Subdomain</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Period ends</th>
              <th className="px-4 py-3">Stripe IDs</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No studios yet.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map(({ studio, subscription: sub }) => (
                <tr
                  key={studio.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {studio.name}
                  </td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                    {studio.slug ? (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5">
                        {studio.slug}
                      </span>
                    ) : (
                      <span className="text-slate-600 italic">not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sub ? (
                      <Badge
                        label={TIER_LABELS[sub.tier] || sub.tier}
                        colorClass={
                          TIER_COLORS[sub.tier] ||
                          "bg-slate-800 text-slate-400 border border-slate-600"
                        }
                      />
                    ) : (
                      <span className="text-slate-600 italic text-xs">
                        none
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sub ? (
                      <Badge
                        label={sub.status.replace("_", " ")}
                        colorClass={
                          STATUS_COLORS[sub.status] ||
                          "bg-slate-800 text-slate-400 border border-slate-600"
                        }
                      />
                    ) : (
                      <span className="text-slate-600 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-xs">
                    {sub
                      ? TIER_PRICES[sub.tier] || `$${sub.priceCad} CAD`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {sub?.currentPeriodEnd
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-[10px] space-y-0.5">
                    {sub?.stripeCustomerId && <div>{sub.stripeCustomerId}</div>}
                    {sub?.stripeSubscriptionId && (
                      <div>{sub.stripeSubscriptionId}</div>
                    )}
                    {!sub?.stripeCustomerId &&
                      !sub?.stripeSubscriptionId &&
                      "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setEditTarget({ studio, subscription: sub })
                      }
                      className="rounded-lg border border-slate-600 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                    >
                      {sub ? "Edit" : "Set up"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <EditModal
          studio={editTarget.studio}
          subscription={editTarget.subscription}
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
