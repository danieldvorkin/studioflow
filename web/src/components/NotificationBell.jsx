import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import {
  MY_NOTIFICATIONS,
  MY_UNREAD_NOTIFICATION_COUNT,
} from "../apollo/queries";
import {
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
  DISMISS_NOTIFICATION,
} from "../apollo/mutations";

// ── Kind metadata ────────────────────────────────────────────────────────────

const KIND_META = {
  subscription_trial_ending: {
    icon: "⏳",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  subscription_trial_expired: {
    icon: "⚠️",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
  subscription_past_due: {
    icon: "⚠️",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
  subscription_payment_failed: {
    icon: "💳",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
  subscription_payment_succeeded: {
    icon: "✅",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  subscription_cancelled: {
    icon: "🚫",
    color: "text-slate-400",
    bg: "bg-slate-500/10 border-slate-500/20",
  },
  subscription_reactivated: {
    icon: "🎉",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
  subscription_upgraded: {
    icon: "🚀",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  subscription_downgraded: {
    icon: "↓",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  class_reminder: {
    icon: "🧘",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
  booking_confirmed: {
    icon: "📅",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  booking_cancelled: {
    icon: "❌",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
  waitlist_promoted: {
    icon: "🎟️",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  new_client_joined: {
    icon: "👤",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
  membership_expiring: {
    icon: "⏰",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  instructor_payout_ready: {
    icon: "💰",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  studio_milestone: {
    icon: "🏆",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
  },
  general: {
    icon: "🔔",
    color: "text-slate-400",
    bg: "bg-slate-800 border-slate-700",
  },
};

function kindMeta(kind) {
  return KIND_META[kind] || KIND_META.general;
}

function timeAgo(isoDate) {
  const diff = (Date.now() - new Date(isoDate).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function NotificationBell({ className = "" }) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const bellRef = useRef(null);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  // Queries
  const { data: countData, refetch: refetchCount } = useQuery(
    MY_UNREAD_NOTIFICATION_COUNT,
    { fetchPolicy: "network-only", pollInterval: 60_000 },
  );
  const { data, refetch: refetchList } = useQuery(MY_NOTIFICATIONS, {
    skip: !open,
    fetchPolicy: "network-only",
  });

  const unreadCount = countData?.myUnreadNotificationCount ?? 0;
  const notifications = data?.myNotifications ?? [];

  // Mutations
  const [markRead] = useMutation(MARK_NOTIFICATION_READ, {
    onCompleted: () => {
      refetchCount();
      refetchList();
    },
  });
  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ, {
    onCompleted: () => {
      refetchCount();
      refetchList();
    },
  });
  const [dismiss] = useMutation(DISMISS_NOTIFICATION, {
    onCompleted: () => {
      refetchCount();
      refetchList();
    },
  });

  // Compute portal panel position from the bell button rect
  useLayoutEffect(() => {
    if (!open || !bellRef.current) return;
    function computePos() {
      const rect = bellRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    computePos();
    window.addEventListener("resize", computePos);
    window.addEventListener("scroll", computePos, true);
    return () => {
      window.removeEventListener("resize", computePos);
      window.removeEventListener("scroll", computePos, true);
    };
  }, [open]);

  // Close on outside click (panel lives in portal, so check both refs)
  useEffect(() => {
    function handleClick(e) {
      const clickedBell = bellRef.current?.contains(e.target);
      const clickedPanel = panelRef.current?.contains(e.target);
      if (!clickedBell && !clickedPanel) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Re-fetch list when opening
  function handleToggle() {
    setOpen((prev) => {
      if (!prev) refetchList();
      return !prev;
    });
  }

  function handleNotificationClick(n) {
    if (!n.read) markRead({ variables: { id: n.id } });
    if (n.actionUrl) {
      setOpen(false);
      navigate(n.actionUrl);
    }
  }

  return (
    <div className={className}>
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={handleToggle}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel — rendered via portal so overflow-hidden ancestors can't clip it */}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: panelPos.top, right: panelPos.right }}
            className="fixed z-[9999] w-80 rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <span className="text-sm font-semibold text-slate-200">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-400">
                    {unreadCount} new
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="text-[11px] text-slate-500 transition hover:text-slate-300"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-600">
                  No notifications
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = kindMeta(n.kind);
                  return (
                    <div
                      key={n.id}
                      className={`group relative border-b border-slate-800/60 px-4 py-3 transition last:border-0 ${
                        !n.read ? "bg-slate-900/60" : ""
                      }`}
                    >
                      <div
                        className="flex cursor-pointer gap-3"
                        onClick={() => handleNotificationClick(n)}
                      >
                        {/* Icon */}
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs ${meta.bg}`}
                        >
                          {meta.icon}
                        </div>
                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-xs font-semibold leading-snug ${
                              !n.read ? "text-slate-100" : "text-slate-400"
                            }`}
                          >
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                              {n.body}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-slate-700">
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>
                        {/* Unread dot */}
                        {!n.read && (
                          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                        )}
                      </div>
                      {/* Dismiss button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss({ variables: { id: n.id } });
                        }}
                        className="absolute right-2 top-2 hidden rounded p-1 text-slate-700 hover:text-slate-400 group-hover:flex"
                        aria-label="Dismiss"
                      >
                        ×
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-slate-800 px-4 py-2.5 text-center">
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/owner/subscription");
                  }}
                  className="text-[11px] text-slate-500 transition hover:text-slate-300"
                >
                  View subscription & billing →
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
