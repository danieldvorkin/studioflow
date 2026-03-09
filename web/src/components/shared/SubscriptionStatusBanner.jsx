import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { MY_STUDIO_SUBSCRIPTION } from "../../apollo/queries";

/**
 * SubscriptionStatusBanner
 *
 * Displays a dismissible top-of-page banner when the owner's subscription
 * needs attention: trial ending soon, past_due, or cancelled.
 *
 * Usage: mount once inside the owner layout / dashboard shell.
 */
export default function SubscriptionStatusBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useQuery(MY_STUDIO_SUBSCRIPTION, {
    fetchPolicy: "cache-first",
  });

  if (dismissed) return null;

  const sub = data?.myStudioSubscription;
  if (!sub || !sub.active) return null;

  const bannerConfig = getBannerConfig(sub);
  if (!bannerConfig) return null;

  const { bg, border, text, icon, message, cta, ctaTo } = bannerConfig;

  return (
    <div
      className={`relative z-30 flex items-center justify-between gap-4 border-b px-4 py-2.5 ${bg} ${border}`}
    >
      <div className="flex items-center gap-2.5 text-xs">
        <span>{icon}</span>
        <span className={`font-medium ${text}`}>{message}</span>
        {cta && (
          <Link
            to={ctaTo}
            className={`font-bold underline underline-offset-2 ${text} hover:opacity-80`}
          >
            {cta}
          </Link>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className={`shrink-0 ${text} opacity-50 hover:opacity-100 transition`}
        aria-label="Dismiss banner"
      >
        ×
      </button>
    </div>
  );
}

function getBannerConfig(sub) {
  const { status, tier, currentPeriodEnd } = sub;

  // ── Past due ────────────────────────────────────────────────────────────
  if (status === "past_due") {
    return {
      bg: "bg-red-950/60",
      border: "border-red-800/50",
      text: "text-red-300",
      icon: "💳",
      message:
        "Your payment failed. Please update your payment method to avoid service interruption.",
      cta: "Update payment →",
      ctaTo: "/owner/subscription",
    };
  }

  // ── Cancelled ───────────────────────────────────────────────────────────
  if (status === "cancelled") {
    return {
      bg: "bg-slate-900/80",
      border: "border-slate-700",
      text: "text-slate-400",
      icon: "🚫",
      message:
        "Your subscription has been cancelled. You're on the free Starter plan.",
      cta: "Re-subscribe →",
      ctaTo: "/owner/subscription",
    };
  }

  // ── Trial ending soon (≤ 3 days) ────────────────────────────────────────
  if (status === "trialing" && currentPeriodEnd) {
    const daysLeft = Math.ceil(
      (new Date(currentPeriodEnd).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysLeft <= 3 && daysLeft >= 0) {
      const tierLabel = TIER_LABELS[tier] || tier;
      return {
        bg: "bg-amber-950/40",
        border: "border-amber-800/40",
        text: "text-amber-300",
        icon: "⏳",
        message: `Your ${tierLabel} trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
        cta: "Add payment method →",
        ctaTo: "/owner/subscription",
      };
    }
  }

  return null;
}

const TIER_LABELS = {
  starter: "Starter",
  pro: "Pro",
  studio: "Studio",
  basic: "Pro",
  premium: "Studio",
};
