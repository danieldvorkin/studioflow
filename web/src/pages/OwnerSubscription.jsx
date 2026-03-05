import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client";
import { useAuth } from "../auth/AuthProvider";
import { useCurrency } from "../currency/CurrencyProvider";
import { MY_STUDIO_SUBSCRIPTION } from "../apollo/queries";
import {
  CREATE_PLATFORM_SUBSCRIPTION_CHECKOUT,
  CREATE_BILLING_PORTAL_SESSION,
} from "../apollo/mutations";

const STATUS_COLORS = {
  active: "bg-green-900/60 text-green-300 border border-green-700",
  trialing: "bg-sky-900/60 text-sky-300 border border-sky-700",
  past_due: "bg-amber-900/60 text-amber-300 border border-amber-700",
  cancelled: "bg-red-900/60 text-red-300 border border-red-700",
  suspended: "bg-slate-800 text-slate-400 border border-slate-600",
};

function Feature({ included, children }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-0.5 flex-shrink-0 text-sm ${included ? "text-green-400" : "text-slate-600"}`}
      >
        {included ? "✓" : "✗"}
      </span>
      <span
        className={`text-sm ${included ? "text-slate-200" : "text-slate-500 line-through"}`}
      >
        {children}
      </span>
    </li>
  );
}

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    priceCad: 0,
    priceUsd: 0,
    description: "Perfect for solo instructors just getting started.",
    features: [
      { label: "Up to 30 bookings/month", included: true },
      { label: "1 instructor account", included: true },
      { label: "Client portal", included: true },
      { label: "Basic analytics", included: true },
      { label: "Email support", included: true },
      { label: "Instructor payout management", included: false },
      { label: "Custom branding", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceCad: 79,
    priceUsd: 59,
    description: "For growing studios with multiple instructors.",
    features: [
      { label: "Unlimited bookings", included: true },
      { label: "Up to 5 instructors", included: true },
      { label: "Client portal", included: true },
      { label: "Full analytics", included: true },
      { label: "Instructor payout management", included: true },
      { label: "Custom branding", included: true },
      { label: "Priority email support", included: true },
      { label: "Dedicated account manager", included: false },
      { label: "API access", included: false },
    ],
  },
  {
    id: "studio",
    name: "Studio",
    priceCad: 175,
    priceUsd: 129,
    description: "For established studios that need everything.",
    features: [
      { label: "Unlimited bookings", included: true },
      { label: "Unlimited instructors", included: true },
      { label: "Client portal", included: true },
      { label: "Full analytics", included: true },
      { label: "Instructor payout management", included: true },
      { label: "Custom branding", included: true },
      { label: "Dedicated account manager", included: true },
      { label: "API access", included: true },
      { label: "Phone & priority support", included: true },
    ],
  },
];

function CurrentPlanBanner({
  sub,
  onManageBilling,
  portalLoading,
  portalError,
  priceDisplay,
}) {
  const tierInfo = TIERS.find((t) => t.id === sub.tier) || TIERS[1];
  const {
    symbol,
    amount,
    label: currencyLabel,
  } = priceDisplay(tierInfo.priceCad, tierInfo.priceUsd);
  const statusLabel = sub.status.replace("_", " ");
  const statusColor = STATUS_COLORS[sub.status] || STATUS_COLORS.active;

  const fmt = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-400">
            Your current plan
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">
            {tierInfo.name}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{tierInfo.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusColor}`}
          >
            {statusLabel}
          </span>
          <div className="text-right">
            <span className="text-2xl font-bold text-white">
              {amount === 0 ? "Free" : `${symbol}${amount}`}
            </span>
            {amount > 0 && (
              <span className="text-sm text-slate-400">
                {" "}
                {currencyLabel} / month
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key dates & identifiers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-800 pt-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Subscribed
          </p>
          <p className="mt-1 text-sm text-white">{fmt(sub.createdAt)}</p>
        </div>
        {sub.currentPeriodEnd && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {sub.status === "trialing" ? "Trial ends" : "Next billing date"}
            </p>
            <p className="mt-1 text-sm text-white">
              {fmt(sub.currentPeriodEnd)}
            </p>
          </div>
        )}
        {sub.cancelledAt && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Cancelled on
            </p>
            <p className="mt-1 text-sm text-red-400">{fmt(sub.cancelledAt)}</p>
          </div>
        )}
        {sub.studio?.slug && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Subdomain
            </p>
            <p className="mt-1 font-mono text-sm text-sky-400">
              {sub.studio.slug}.studioflow.app
            </p>
          </div>
        )}
        {sub.stripeSubscriptionId && (
          <div className="col-span-2 sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Subscription ID
            </p>
            <p className="mt-1 font-mono text-xs text-slate-400 truncate">
              {sub.stripeSubscriptionId}
            </p>
          </div>
        )}
      </div>

      {/* Trial callout */}
      {sub.status === "trialing" && (
        <div className="rounded-lg border border-sky-700 bg-sky-900/30 px-4 py-3 text-sm text-sky-200">
          <span className="font-semibold">You're on a free trial.</span>{" "}
          {sub.currentPeriodEnd ? (
            <>
              Your trial ends on{" "}
              <span className="font-semibold">{fmt(sub.currentPeriodEnd)}</span>
              . No charge until then — manage your payment method below.
            </>
          ) : (
            <>
              No charge until the trial ends. Add a payment method via Manage
              Billing below.
            </>
          )}
        </div>
      )}

      {/* Billing management */}
      <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-300">
            Payment method &amp; billing
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Update your card, view invoices, or cancel your subscription via
            Stripe's secure portal.
          </p>
        </div>
        <button
          type="button"
          onClick={onManageBilling}
          disabled={portalLoading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-60"
        >
          {portalLoading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              Opening…
            </>
          ) : (
            "Manage Billing →"
          )}
        </button>
      </div>

      {portalError && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-200">
          {portalError}
        </div>
      )}

      {sub.status === "past_due" && (
        <div className="rounded-lg border border-amber-700 bg-amber-900/30 px-4 py-3 text-sm text-amber-200">
          Your subscription payment is past due. Use{" "}
          <span className="font-semibold">Manage Billing</span> above to update
          your card, or contact{" "}
          <a href="mailto:support@joinstudioflow.com" className="underline">
            support@joinstudioflow.com
          </a>
          .
        </div>
      )}
      {sub.status === "cancelled" && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-200">
          Your subscription has been cancelled. Select a plan below to
          resubscribe.
        </div>
      )}
      {sub.status === "suspended" && (
        <div className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-slate-300">
          Your account is currently suspended. Please contact{" "}
          <a
            href="mailto:billing@studioflow.app"
            className="text-sky-400 underline"
          >
            billing@studioflow.app
          </a>
          .
        </div>
      )}
    </div>
  );
}

function TierCard({
  tier,
  isCurrent,
  isActive,
  onSubscribe,
  loading,
  priceDisplay,
}) {
  const {
    symbol,
    amount,
    label: currencyLabel,
  } = priceDisplay(tier.priceCad, tier.priceUsd);
  return (
    <div
      className={`relative rounded-xl border p-5 transition ${
        isCurrent && isActive
          ? "border-sky-600 bg-sky-950/30 ring-1 ring-sky-600"
          : "border-slate-700 bg-slate-900"
      }`}
    >
      {isCurrent && isActive && (
        <span className="absolute right-4 top-4 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
          Current
        </span>
      )}
      {tier.id === "studio" && !(isCurrent && isActive) && (
        <span className="absolute right-4 top-4 rounded-full bg-purple-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
          Best value
        </span>
      )}
      <h3 className="text-base font-bold text-white">{tier.name}</h3>
      <p className="mt-0.5 text-xs text-slate-400">{tier.description}</p>
      <div className="mt-3 mb-4">
        <span className="text-3xl font-bold text-white">
          {amount === 0 ? "Free" : `${symbol}${amount}`}
        </span>
        {amount > 0 && (
          <span className="text-sm text-slate-400">
            {" "}
            {currencyLabel} / month
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {tier.features.map((f) => (
          <Feature key={f.label} included={f.included}>
            {f.label}
          </Feature>
        ))}
      </ul>
      <div className="mt-5">
        {isCurrent && isActive ? (
          <p className="text-center text-xs text-slate-500">
            To cancel or change plans, use{" "}
            <span className="font-medium text-slate-300">Manage Billing</span>{" "}
            above or contact{" "}
            <a
              href="mailto:support@joinstudioflow.com"
              className="text-sky-400 hover:underline"
            >
              support@joinstudioflow.com
            </a>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => onSubscribe(tier.id)}
            disabled={loading === tier.id}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
              tier.id === "studio"
                ? "bg-purple-600 text-white hover:bg-purple-500"
                : tier.id === "pro"
                  ? "bg-sky-600 text-white hover:bg-sky-500"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600"
            }`}
          >
            {loading === tier.id ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Redirecting to Stripe…
              </>
            ) : tier.price === 0 ? (
              "Switch to Free (Starter)"
            ) : (
              `Subscribe to ${tier.name} — ${symbol}${amount}/mo`
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function OwnerSubscription() {
  const auth = useAuth();
  const user = auth.user;
  const { currency, priceDisplay } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkoutError, setCheckoutError] = useState(null);
  const [loadingTier, setLoadingTier] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(null);

  const roleRaw = (user?.roleName || "").toString().toLowerCase();
  const isGodmode = user?.godmode === true || roleRaw === "godmode";
  const isOwner = isGodmode || roleRaw === "owner" || user?.role === 0;

  // Latch the initial URL param values at mount so the banners persist after
  // useEffect cleans the params from the URL (prevents re-derive as false).
  const [checkoutSuccess] = useState(
    () => searchParams.get("checkout_success") === "1",
  );
  const [checkoutCancelled] = useState(
    () => searchParams.get("checkout_cancelled") === "1",
  );

  const { data, loading, refetch } = useQuery(MY_STUDIO_SUBSCRIPTION, {
    skip: !user || !isOwner || isGodmode,
    fetchPolicy: "cache-and-network",
  });

  const [createCheckout] = useMutation(CREATE_PLATFORM_SUBSCRIPTION_CHECKOUT);
  const [createBillingPortal] = useMutation(CREATE_BILLING_PORTAL_SESSION);

  useEffect(() => {
    if (checkoutSuccess || checkoutCancelled) {
      if (checkoutSuccess) refetch();
      const next = new URLSearchParams(searchParams);
      next.delete("checkout_success");
      next.delete("checkout_cancelled");
      next.delete("session_id");
      setSearchParams(next, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !isOwner) return <Navigate to="/dashboard" replace />;

  const sub = data?.myStudioSubscription;
  const currentTierId = sub?.tier || null;
  const isSubActive = sub?.active === true;

  const handleManageBilling = async () => {
    setPortalError(null);
    setPortalLoading(true);
    try {
      const { data: result } = await createBillingPortal();
      const errs = result?.createBillingPortalSession?.errors || [];
      const url = result?.createBillingPortalSession?.portalUrl;
      if (errs.length > 0) {
        setPortalError(errs.join(", "));
        setPortalLoading(false);
        return;
      }
      if (url) {
        window.location.href = url;
      } else {
        setPortalError("Could not open billing portal. Please try again.");
        setPortalLoading(false);
      }
    } catch (e) {
      setPortalError(e.message);
      setPortalLoading(false);
    }
  };

  const handleSubscribe = async (tier) => {
    setCheckoutError(null);
    setLoadingTier(tier);
    try {
      const { data: result } = await createCheckout({
        variables: { tier, currency, billingInterval: "month" },
      });
      const errs = result?.createPlatformSubscriptionCheckout?.errors || [];
      const url = result?.createPlatformSubscriptionCheckout?.checkoutUrl;
      if (errs.length > 0) {
        setCheckoutError(errs.join(", "));
        setLoadingTier(null);
        return;
      }
      if (url) {
        window.location.href = url;
      } else {
        setCheckoutError("Something went wrong. Please try again.");
        setLoadingTier(null);
      }
    } catch (e) {
      setCheckoutError(e.message);
      setLoadingTier(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-white">Subscription</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your StudioFlow plan and billing information.
        </p>
      </div>

      {checkoutSuccess && (
        <div className="flex items-start gap-3 rounded-xl border border-green-700 bg-green-900/30 px-5 py-4 text-sm text-green-200">
          <span className="text-lg leading-none">🎉</span>
          <div>
            <p className="font-semibold">
              Payment successful — welcome to StudioFlow!
            </p>
            <p className="mt-0.5 text-green-300/80">
              Your subscription is now active. It may take a few seconds to
              reflect below.
            </p>
          </div>
        </div>
      )}
      {checkoutCancelled && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-4 text-sm text-slate-400">
          Checkout was cancelled. No charge was made. Select a plan below to try
          again.
        </div>
      )}
      {checkoutError && (
        <div className="rounded-xl border border-red-700 bg-red-900/30 px-5 py-4 text-sm text-red-200">
          {checkoutError}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-500">Loading subscription…</div>
      ) : sub ? (
        <CurrentPlanBanner
          sub={sub}
          onManageBilling={handleManageBilling}
          portalLoading={portalLoading}
          portalError={portalError}
          priceDisplay={priceDisplay}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900 px-5 py-6 text-center">
          <p className="text-sm font-medium text-slate-300">
            No active subscription yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Choose a plan below to get started. You’ll be taken to Stripe to
            complete payment.
          </p>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-base font-semibold uppercase tracking-widest text-sky-400">
          Choose a plan
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              isCurrent={currentTierId === tier.id}
              isActive={isSubActive}
              onSubscribe={handleSubscribe}
              loading={loadingTier}
              priceDisplay={priceDisplay}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Payments are processed securely by Stripe. By subscribing you agree to
        monthly recurring billing until cancelled. To cancel or get help,
        contact{" "}
        <a
          href="mailto:support@joinstudioflow.com"
          className="text-sky-400 hover:underline"
        >
          support@joinstudioflow.com
        </a>
        .
      </p>
    </div>
  );
}
