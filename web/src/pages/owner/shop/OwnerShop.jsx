import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useMutation, useQuery } from "@apollo/client";
import { Navigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import {
  CURRENT_USER,
  PAYMENT_SETTINGS,
  SHOP_ITEMS,
  SHOP_ORDERS,
} from "../../../apollo/queries";
import {
  CREATE_SHOP_ITEM,
  UPDATE_SHOP_ITEM,
  DELETE_SHOP_ITEM,
  UPDATE_SHOP_ORDER,
} from "../../../apollo/mutations";
import { useToast } from "../../../components/shared/ToastProvider";
import { isOwner, isStaff } from "../../../auth/permissions";
import { useCurrency } from "../../../currency/CurrencyProvider";

function centsFromDollars(val) {
  const n = Number(val);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function dollarsFromCents(cents) {
  if (typeof cents !== "number") return "";
  return (cents / 100).toFixed(2);
}

const BLANK_FORM = {
  title: "",
  description: "",
  priceDollars: "0",
  currency: "cad",
  itemType: "sale",
  stockQuantity: "",
  active: true,
  imageUrl: "",
  rentalAgreementText: "",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(cents, currency = "cad") {
  if (typeof cents !== "number") return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: (currency || "cad").toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function pctChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function TrendBadge({ value }) {
  if (value === null || value === undefined) return null;
  const positive = value >= 0;
  return (
    <span
      className={`ml-1 text-[11px] font-semibold ${positive ? "text-emerald-400" : "text-rose-400"}`}
    >
      {positive ? "▲" : "▼"} {Math.abs(value).toFixed(0)}%
    </span>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, trend, accent = "sky" }) {
  const accentMap = {
    sky: "border-sky-500/30 bg-sky-950/20",
    emerald: "border-emerald-500/30 bg-emerald-950/20",
    amber: "border-amber-500/30 bg-amber-950/20",
    rose: "border-rose-500/30 bg-rose-950/20",
    violet: "border-violet-500/30 bg-violet-950/20",
  };
  const textMap = {
    sky: "text-sky-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    violet: "text-violet-300",
  };
  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl border p-4 ${accentMap[accent]}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${textMap[accent]}`}>{value}</span>
        <TrendBadge value={trend} />
      </div>
      {sub && <span className="text-[11px] text-slate-500">{sub}</span>}
    </div>
  );
}

// ── Mini bar chart with interactive popover ───────────────────────────────────

function BarPopover({ bar, onClose, onOrderClick }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="absolute bottom-[calc(100%+10px)] left-1/2 z-30 w-64 -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60"
      // Stop mouse events from bubbling to the bar or the outer leave handler
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
    >
      {/* Arrow */}
      <div className="absolute -bottom-[6px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-slate-700 bg-slate-900" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 rounded-t-2xl border-b border-slate-800 px-3 py-2">
        <span className="text-[11px] font-semibold text-slate-200">
          {bar.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-sky-300">
            {bar.display}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-0.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800"
            aria-label="Close"
          >
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-2">
        {bar.orders && bar.orders.length > 0 ? (
          <>
            <div className="mb-1 px-1 text-[10px] text-slate-500">
              {bar.orders.length} order{bar.orders.length !== 1 ? "s" : ""}
            </div>
            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.600)_transparent]">
              {bar.orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onOrderClick(o)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] hover:bg-slate-800 transition-colors"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-semibold text-slate-200">
                      {o.client?.name || o.client?.email || "—"}
                    </span>
                    <span className="truncate text-slate-500">
                      {o.shopItem?.title}
                      {o.quantity > 1 ? ` ×${o.quantity}` : ""}
                    </span>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <span className="font-bold text-emerald-300">
                      {formatCurrency(o.totalCents, o.currency)}
                    </span>
                    <span
                      className={`rounded-full px-1.5 text-[9px] font-semibold ${
                        o.status === "paid" || o.status === "returned"
                          ? "bg-emerald-950 text-emerald-400"
                          : o.status === "cancelled"
                            ? "bg-rose-950 text-rose-400"
                            : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-1.5 border-t border-slate-800 pt-1.5 px-1">
              <button
                type="button"
                onClick={() => {
                  onOrderClick(null);
                }}
                className="text-[10px] text-sky-400 hover:text-sky-300 hover:underline transition-colors"
              >
                View all orders for this day →
              </button>
            </div>
          </>
        ) : (
          <p className="px-1 py-2 text-[10px] text-slate-500">
            No orders this day.
          </p>
        )}
      </div>
    </div>
  );
}

function MiniBarChart({ data, label, range, onRangeChange, onOrderClick }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const [pinnedIdx, setPinnedIdx] = useState(null);
  const max = Math.max(...data.map((d) => d.value), 1);

  const RANGES = [
    { key: 7, label: "7d" },
    { key: 14, label: "14d" },
    { key: 30, label: "30d" },
    { key: 90, label: "90d" },
  ];

  const visibleIdx = pinnedIdx ?? activeIdx;
  const visibleBar = visibleIdx !== null ? data[visibleIdx] : null;

  const closePopover = () => {
    setPinnedIdx(null);
    setActiveIdx(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                onRangeChange(r.key);
                closePopover();
              }}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                range === r.key
                  ? "bg-sky-500 text-on-accent"
                  : "border border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bars */}
      <div className="flex h-24 items-end gap-[2px] overflow-visible">
        {data.map((d, i) => {
          const isActive = visibleIdx === i;
          const isPinned = pinnedIdx === i;
          const hasRevenue = d.value > 0;
          return (
            <div
              key={i}
              className="relative flex-1 min-w-0 flex items-end"
              style={{ height: "100%" }}
              onMouseEnter={() => {
                if (pinnedIdx === null) setActiveIdx(i);
              }}
              onMouseLeave={() => {
                if (pinnedIdx === null) setActiveIdx(null);
              }}
            >
              <button
                type="button"
                aria-label={`${d.label}: ${d.display}`}
                onClick={() => {
                  if (isPinned) {
                    closePopover();
                  } else {
                    setPinnedIdx(i);
                    setActiveIdx(i);
                  }
                }}
                className={`w-full rounded-t-sm transition-all duration-75 focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 ${
                  isActive
                    ? isPinned
                      ? "bg-sky-200"
                      : "bg-sky-300"
                    : hasRevenue
                      ? "bg-sky-500/70 hover:bg-sky-400"
                      : "bg-slate-700/40 hover:bg-slate-600/60"
                }`}
                style={{ height: `${Math.max((d.value / max) * 100, 3)}%` }}
              />
              {isActive && visibleBar && (
                <BarPopover
                  bar={visibleBar}
                  onClose={closePopover}
                  onOrderClick={(order) => {
                    closePopover();
                    onOrderClick(order);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[9px] text-slate-600">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────

function DashboardTab({ shopItems, shopOrders, onOrderClick }) {
  const now = new Date();
  const [chartRange, setChartRange] = useState(30);

  // Date helpers
  const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const monthStart = (offset = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const monthEnd = (offset = 0) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  // Paid/returned orders = revenue recognised
  const revenueOrders = useMemo(
    () =>
      shopOrders.filter((o) => o.status === "paid" || o.status === "returned"),
    [shopOrders],
  );

  const totalRevenue = revenueOrders.reduce(
    (s, o) => s + (o.totalCents || 0),
    0,
  );

  const thisMonthRevenue = revenueOrders
    .filter((o) => {
      const d = new Date(o.createdAt);
      return d >= monthStart(0) && d <= monthEnd(0);
    })
    .reduce((s, o) => s + (o.totalCents || 0), 0);

  const lastMonthRevenue = revenueOrders
    .filter((o) => {
      const d = new Date(o.createdAt);
      return d >= monthStart(1) && d <= monthEnd(1);
    })
    .reduce((s, o) => s + (o.totalCents || 0), 0);

  const revenueChangePct = pctChange(thisMonthRevenue, lastMonthRevenue);

  const totalOrders = shopOrders.length;
  const thisMonthOrders = shopOrders.filter((o) => {
    const d = new Date(o.createdAt);
    return d >= monthStart(0) && d <= monthEnd(0);
  }).length;
  const lastMonthOrders = shopOrders.filter((o) => {
    const d = new Date(o.createdAt);
    return d >= monthStart(1) && d <= monthEnd(1);
  }).length;
  const ordersChangePct = pctChange(thisMonthOrders, lastMonthOrders);

  const rentalsOutstanding = shopOrders.filter(
    (o) =>
      o.status === "paid" && o.shopItem?.itemType === "rental" && !o.returnedAt,
  ).length;

  const overdueRentals = shopOrders.filter((o) => {
    if (o.status !== "paid" || o.shopItem?.itemType !== "rental") return false;
    if (!o.rentalDueDate) return false;
    return new Date(o.rentalDueDate) < now;
  }).length;

  // Inventory health
  const activeItems = shopItems.filter((i) => i.active);
  const outOfStock = activeItems.filter(
    (i) => !i.inStock && i.stockQuantity !== null,
  );
  const lowStock = activeItems.filter(
    (i) => i.inStock && i.stockQuantity !== null && i.stockQuantity <= 3,
  );

  // Top items by revenue (from paid/returned orders)
  const revenueByItem = {};
  const ordersByItem = {};
  revenueOrders.forEach((o) => {
    const id = o.shopItem?.id;
    if (!id) return;
    revenueByItem[id] = (revenueByItem[id] || 0) + (o.totalCents || 0);
    ordersByItem[id] = (ordersByItem[id] || 0) + 1;
  });
  const topItems = Object.entries(revenueByItem)
    .map(([id, rev]) => {
      const item =
        shopItems.find((i) => i.id === id) ||
        revenueOrders.find((o) => o.shopItem?.id === id)?.shopItem;
      return {
        id,
        title: item?.title || "Unknown",
        currency: item?.currency || "cad",
        revenue: rev,
        orders: ordersByItem[id] || 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Daily revenue bar chart (range-aware)
  const dailyBars = (() => {
    const bars = [];
    for (let i = chartRange - 1; i >= 0; i--) {
      const d = startOfDay(new Date(now));
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const dayOrders = shopOrders.filter((o) => {
        const od = new Date(o.createdAt);
        return od >= d && od < next;
      });
      const dayRevenue = dayOrders
        .filter((o) => o.status === "paid" || o.status === "returned")
        .reduce((s, o) => s + (o.totalCents || 0), 0);
      const label = d.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
      });
      bars.push({
        label,
        value: dayRevenue,
        display: formatCurrency(dayRevenue),
        orders: dayOrders,
      });
    }
    return bars;
  })();

  // Forecasting: always uses trailing 30-day basis for stable projections
  const trailing30Revenue = (() => {
    const cutoff = startOfDay(new Date(now));
    cutoff.setDate(cutoff.getDate() - 29);
    return revenueOrders
      .filter((o) => new Date(o.createdAt) >= cutoff)
      .reduce((s, o) => s + (o.totalCents || 0), 0);
  })();
  const last30Revenue = trailing30Revenue;
  const avgDaily = last30Revenue / 30;
  const projectedMonthly = avgDaily * 30;

  // Days remaining this month for current month projection
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const projectedMonthEnd = thisMonthRevenue + avgDaily * daysRemaining;

  const defaultCurrency =
    shopItems[0]?.currency || shopOrders[0]?.currency || "cad";

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue, defaultCurrency)}
          sub="all time"
          accent="emerald"
        />
        <StatCard
          label="This Month"
          value={formatCurrency(thisMonthRevenue, defaultCurrency)}
          sub={`${lastMonthRevenue > 0 ? `vs ${formatCurrency(lastMonthRevenue, defaultCurrency)} last mo` : "first month of data"}`}
          trend={revenueChangePct}
          accent="sky"
        />
        <StatCard
          label="Total Orders"
          value={totalOrders}
          sub={`${thisMonthOrders} this month`}
          trend={ordersChangePct}
          accent="violet"
        />
        <StatCard
          label="Rentals Out"
          value={rentalsOutstanding}
          sub={
            overdueRentals > 0 ? `${overdueRentals} overdue` : "none overdue"
          }
          accent={overdueRentals > 0 ? "rose" : "amber"}
        />
        <StatCard
          label="Active Items"
          value={activeItems.length}
          sub={
            outOfStock.length > 0
              ? `${outOfStock.length} out of stock`
              : "all in stock"
          }
          accent={outOfStock.length > 0 ? "rose" : "emerald"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 overflow-visible">
          <MiniBarChart
            data={dailyBars}
            label={`Daily Revenue — Last ${chartRange} Days`}
            range={chartRange}
            onRangeChange={setChartRange}
            onOrderClick={onOrderClick}
          />
        </div>

        {/* Forecast */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Forecast
          </span>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">
                Avg daily revenue (30d basis)
              </span>
              <span className="font-semibold text-slate-200">
                {formatCurrency(Math.round(avgDaily), defaultCurrency)}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Month-end projection</span>
              <span className="font-semibold text-violet-300">
                {formatCurrency(Math.round(projectedMonthEnd), defaultCurrency)}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Projected monthly run-rate</span>
              <span className="font-semibold text-sky-300">
                {formatCurrency(Math.round(projectedMonthly), defaultCurrency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Days remaining this month</span>
              <span className="font-semibold text-slate-200">
                {daysRemaining}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top items */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Top Items by Revenue
          </span>
          {topItems.length === 0 ? (
            <p className="text-xs text-slate-500">No revenue recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {topItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 shrink-0 text-slate-600 font-bold">
                      {idx + 1}
                    </span>
                    <span className="truncate text-slate-200">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-slate-400">{item.orders} orders</span>
                    <span className="font-semibold text-emerald-300">
                      {formatCurrency(item.revenue, item.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory alerts */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Inventory Alerts
          </span>
          {outOfStock.length === 0 &&
          lowStock.length === 0 &&
          overdueRentals === 0 ? (
            <p className="text-xs text-emerald-400">✓ All good — no alerts</p>
          ) : (
            <div className="flex flex-col gap-2">
              {outOfStock.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate text-slate-300">{item.title}</span>
                  <span className="ml-2 shrink-0 rounded-full bg-rose-950/60 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                    Out of stock
                  </span>
                </div>
              ))}
              {lowStock.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate text-slate-300">{item.title}</span>
                  <span className="ml-2 shrink-0 rounded-full bg-amber-950/60 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    {item.stockQuantity} left
                  </span>
                </div>
              ))}
              {overdueRentals > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Overdue rentals</span>
                  <span className="ml-2 shrink-0 rounded-full bg-rose-950/60 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                    {overdueRentals} overdue
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Item form ────────────────────────────────────────────────────────────────

function ItemForm({
  initial = BLANK_FORM,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => {
    const val =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit({
      ...form,
      priceCents: centsFromDollars(form.priceDollars),
      stockQuantity:
        form.stockQuantity === "" || form.stockQuantity === null
          ? null
          : parseInt(form.stockQuantity, 10),
    });
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">
            Title <span className="text-rose-400">*</span>
          </label>
          <input
            required
            value={form.title}
            onChange={set("title")}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            placeholder="Yoga mat, foam roller…"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">Type</label>
          <select
            value={form.itemType}
            onChange={set("itemType")}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="sale">For sale</option>
            <option value="rental">For rental</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">
            Price ($)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.priceDollars}
            onChange={set("priceDollars")}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">
            Currency
          </label>
          <select
            value={form.currency}
            onChange={set("currency")}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          >
            <option value="cad">CAD</option>
            <option value="usd">USD</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">
            Stock quantity{" "}
            <span className="text-slate-500">(blank = unlimited)</span>
          </label>
          <input
            type="number"
            min={0}
            value={form.stockQuantity}
            onChange={set("stockQuantity")}
            placeholder="Unlimited"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">
            Image URL <span className="text-slate-500">(optional)</span>
          </label>
          <input
            type="url"
            value={form.imageUrl}
            onChange={set("imageUrl")}
            placeholder="https://…"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-medium text-slate-300">
          Description
        </label>
        <textarea
          rows={2}
          value={form.description}
          onChange={set("description")}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          placeholder="Optional description…"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={form.active}
          onChange={set("active")}
          className="h-3 w-3 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500"
        />
        Active (visible to clients)
      </label>

      {form.itemType === "rental" && (
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300">
            Rental Agreement{" "}
            <span className="text-slate-500">
              (leave blank to use the default agreement)
            </span>
          </label>
          <textarea
            rows={6}
            value={form.rentalAgreementText}
            onChange={set("rentalAgreementText")}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[11px] leading-relaxed text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            placeholder="Custom rental agreement text shown to clients before checkout. Leave blank to use the built-in default agreement."
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-on-accent hover:bg-sky-400 disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center rounded-full border border-slate-700 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ── Order show modal ─────────────────────────────────────────────────────────

function OrderModal({ order, onClose, onStatusChange }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isOverdue =
    order.status === "paid" &&
    order.shopItem?.itemType === "rental" &&
    order.rentalDueDate &&
    new Date(order.rentalDueDate) < new Date();

  const stripeUrl = order.stripePaymentIntentId
    ? `https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-slate-100 truncate">
              {order.client?.name || order.client?.email || "Order"}
            </span>
            <OrderStatusBadge status={order.status} />
            {isOverdue && (
              <span className="rounded-full bg-rose-950/60 border border-rose-600/40 px-2 py-0.5 text-[9px] font-semibold text-rose-300">
                ⚠ Overdue
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col divide-y divide-slate-800 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.600)_transparent]">
          {/* Item section */}
          <div className="px-5 py-4">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Item
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold text-slate-100 text-sm">
                  {order.shopItem?.title}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      order.shopItem?.itemType === "rental"
                        ? "bg-amber-950/60 text-amber-300"
                        : "bg-emerald-950/60 text-emerald-300"
                    }`}
                  >
                    {order.shopItem?.itemType}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-bold text-emerald-300">
                  {formatCurrency(order.totalCents, order.currency)}
                </div>
                <div className="text-[11px] text-slate-400">
                  {order.quantity} ×{" "}
                  {formatCurrency(order.shopItem?.priceCents, order.currency)}
                </div>
              </div>
            </div>
          </div>

          {/* Client section */}
          <div className="px-5 py-4">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Client
            </div>
            <div className="flex flex-col gap-1 text-xs">
              {order.client?.name && (
                <span className="text-slate-200 font-medium">
                  {order.client.name}
                </span>
              )}
              {order.client?.email && (
                <span className="text-slate-400">{order.client.email}</span>
              )}
            </div>
          </div>

          {/* Order details */}
          <div className="px-5 py-4">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Details
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500">Ordered</span>
                <span className="text-slate-200">
                  {new Date(order.createdAt).toLocaleDateString("en-CA", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500">Currency</span>
                <span className="text-slate-200 uppercase">
                  {order.currency}
                </span>
              </div>
              {order.rentalDueDate && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500">Rental due</span>
                  <span
                    className={`font-medium ${isOverdue ? "text-rose-300" : "text-slate-200"}`}
                  >
                    {order.rentalDueDate}
                    {isOverdue && " — overdue"}
                  </span>
                </div>
              )}
              {order.returnedAt && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500">Returned</span>
                  <span className="text-slate-200">
                    {new Date(order.returnedAt).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              {order.rentalAgreementAcceptedAt && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500">Agreement</span>
                  <span className="text-emerald-400 text-[11px]">
                    ✓ Accepted
                  </span>
                </div>
              )}
              {order.stripePaymentIntentId && (
                <div className="col-span-2 flex flex-col gap-0.5">
                  <span className="text-slate-500">Stripe payment</span>
                  {stripeUrl ? (
                    <a
                      href={stripeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-sky-400 hover:text-sky-300 hover:underline break-all"
                    >
                      {order.stripePaymentIntentId}
                    </a>
                  ) : (
                    <span className="font-mono text-[10px] text-slate-400 break-all">
                      {order.stripePaymentIntentId}
                    </span>
                  )}
                </div>
              )}
              {order.notes && (
                <div className="col-span-2 flex flex-col gap-0.5">
                  <span className="text-slate-500">Notes</span>
                  <span className="text-slate-300">{order.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer — status actions */}
        {(order.status === "pending" ||
          (order.status === "paid" &&
            order.shopItem?.itemType === "rental")) && (
          <div className="px-5 py-4 border-t border-slate-800 flex flex-wrap items-center gap-2 shrink-0">
            {order.status === "pending" && (
              <>
                <button
                  type="button"
                  onClick={() => onStatusChange(order, "paid")}
                  className="rounded-full bg-emerald-600/80 px-4 py-1.5 text-xs font-semibold text-emerald-50 hover:bg-emerald-500 transition-colors"
                >
                  Mark paid
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange(order, "cancelled")}
                  className="rounded-full border border-rose-700/50 px-4 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 transition-colors"
                >
                  Cancel order
                </button>
              </>
            )}
            {order.status === "paid" &&
              order.shopItem?.itemType === "rental" && (
                <button
                  type="button"
                  onClick={() => onStatusChange(order, "returned")}
                  className="rounded-full border border-amber-600/50 px-4 py-1.5 text-xs text-amber-300 hover:bg-amber-950/40 transition-colors"
                >
                  Mark returned
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Order status badge ────────────────────────────────────────────────────────

function OrderStatusBadge({ status }) {
  const styles = {
    pending: "border-slate-600 bg-slate-800 text-slate-300",
    paid: "border-emerald-600/50 bg-emerald-950/50 text-emerald-300",
    cancelled: "border-rose-600/50 bg-rose-950/50 text-rose-300",
    returned: "border-amber-600/50 bg-amber-950/50 text-amber-300",
  };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${styles[status] || styles.pending}`}
    >
      {status}
    </span>
  );
}

// ── Items tab ─────────────────────────────────────────────────────────────────

// ── Shared paginator ─────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

function Paginator({ page, totalPages, total, pageSize, onPage, onPageSize }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2.5">
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <span>{total === 0 ? "No records" : `${from}–${to} of ${total}`}</span>
        <span className="text-slate-600">·</span>
        <label className="flex items-center gap-1.5">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSize(Number(e.target.value));
              onPage(1);
            }}
            className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300 outline-none focus:border-sky-500 cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPage(1)}
          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-25 transition-colors"
          aria-label="First page"
        >
          «
        </button>
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-25 transition-colors"
        >
          ← Prev
        </button>
        <span className="px-2 text-[11px] text-slate-500">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-25 transition-colors"
        >
          Next →
        </button>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPage(totalPages)}
          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-25 transition-colors"
          aria-label="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
}

// ── Items tab ─────────────────────────────────────────────────────────────────

function ItemsTab({
  shopItems,
  itemsLoading,
  onEdit,
  onDelete,
  editingId,
  onCancelEdit,
  onUpdate,
  onCreate,
  showNewForm,
  onToggleNew,
}) {
  const { formatPrice } = useCurrency();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, activeFilter, pageSize]);

  const filtered = shopItems.filter((item) => {
    if (typeFilter !== "all" && item.itemType !== typeFilter) return false;
    if (activeFilter === "active" && !item.active) return false;
    if (activeFilter === "inactive" && item.active) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-44 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          <div className="flex items-center gap-1">
            {["all", "sale", "rental"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTypeFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                  typeFilter === f
                    ? "bg-sky-500 text-on-accent"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {[
              ["all", "All"],
              ["active", "Active"],
              ["inactive", "Inactive"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setActiveFilter(val)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeFilter === val
                    ? "bg-slate-600 text-slate-100"
                    : "border border-slate-700 bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {filtered.length > 0 && (
            <span className="text-[11px] text-slate-500">
              {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleNew}
          className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-on-accent hover:bg-sky-400"
        >
          {showNewForm ? "Cancel" : "+ Add item"}
        </button>
      </div>

      {showNewForm && (
        <ItemForm
          onSubmit={onCreate}
          onCancel={onToggleNew}
          submitLabel="Create item"
        />
      )}

      {itemsLoading && <p className="text-sm text-slate-400">Loading items…</p>}

      {!itemsLoading && shopItems.length === 0 && !showNewForm && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center text-sm text-slate-400">
          No shop items yet. Add one above to get started.
        </div>
      )}

      {!itemsLoading && shopItems.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center text-xs text-slate-400">
          No items match your filters.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {paginated.map((item) =>
          editingId === item.id ? (
            <ItemForm
              key={item.id}
              initial={{
                title: item.title,
                description: item.description || "",
                priceDollars: dollarsFromCents(item.priceCents),
                currency: item.currency,
                itemType: item.itemType,
                stockQuantity: item.stockQuantity ?? "",
                active: item.active,
                imageUrl: item.imageUrl || "",
                rentalAgreementText: item.rentalAgreementText || "",
              }}
              onSubmit={onUpdate(item)}
              onCancel={onCancelEdit}
              submitLabel="Save changes"
            />
          ) : (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs text-slate-200"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-50">
                    {item.title}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                      item.itemType === "rental"
                        ? "bg-amber-950/60 text-amber-300"
                        : "bg-emerald-950/60 text-emerald-300"
                    }`}
                  >
                    {item.itemType}
                  </span>
                  {!item.active && (
                    <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">
                      Inactive
                    </span>
                  )}
                  {item.stockQuantity !== null && !item.inStock && (
                    <span className="rounded-full bg-rose-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                      Out of stock
                    </span>
                  )}
                  {item.stockQuantity !== null &&
                    item.inStock &&
                    item.stockQuantity <= 3 && (
                      <span className="rounded-full bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                        Low: {item.stockQuantity} left
                      </span>
                    )}
                </div>
                <span className="text-slate-400">
                  {formatPrice(item.priceCents, item.currency)} ·{" "}
                  {item.stockQuantity === null
                    ? "Unlimited stock"
                    : `${item.stockQuantity} in stock`}
                  {item.itemType === "rental" && (
                    <span
                      className={`ml-2 ${item.rentalAgreementText ? "text-amber-400" : "text-slate-500"}`}
                    >
                      ·{" "}
                      {item.rentalAgreementText
                        ? "Custom agreement"
                        : "Default agreement"}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(item.id)}
                  className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="rounded-full border border-rose-700/50 px-3 py-1 text-[11px] text-rose-400 hover:bg-rose-950/40"
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      <Paginator
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={setPageSize}
      />
    </div>
  );
}

// ── Orders tab ────────────────────────────────────────────────────────────────

function OrdersTab({
  shopOrders,
  ordersLoading,
  onStatusChange,
  onOrderClick,
  initialSearch = "",
}) {
  const { formatPrice } = useCurrency();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState(initialSearch);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sort, pageSize]);

  const statuses = ["all", "pending", "paid", "cancelled", "returned"];

  const filtered = (() => {
    const base = shopOrders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          (o.client?.name || "").toLowerCase().includes(q) ||
          (o.client?.email || "").toLowerCase().includes(q) ||
          (o.shopItem?.title || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
    if (sort === "oldest")
      return [...base].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      );
    if (sort === "amount-desc")
      return [...base].sort(
        (a, b) => (b.totalCents || 0) - (a.totalCents || 0),
      );
    if (sort === "amount-asc")
      return [...base].sort(
        (a, b) => (a.totalCents || 0) - (b.totalCents || 0),
      );
    return [...base].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    ); // newest
  })();

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalFiltered = filtered.reduce(
    (sum, o) =>
      o.status === "paid" || o.status === "returned"
        ? sum + (o.totalCents || 0)
        : sum,
    0,
  );

  const defaultCurrency = shopOrders[0]?.currency || "cad";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client or item…"
          className="w-52 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
        <div className="flex flex-wrap items-center gap-1">
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount-desc">Amount: high → low</option>
            <option value="amount-asc">Amount: low → high</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {statuses.map((s) => {
            const count =
              s === "all"
                ? shopOrders.length
                : shopOrders.filter((o) => o.status === s).length;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                  statusFilter === s
                    ? "bg-sky-500 text-on-accent"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {s} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{filtered.length} orders</span>
          {totalFiltered > 0 && (
            <>
              <span>·</span>
              <span className="text-emerald-400 font-semibold">
                {formatCurrency(totalFiltered, defaultCurrency)} recognised
                revenue
              </span>
            </>
          )}
        </div>
      )}

      {ordersLoading && (
        <p className="text-sm text-slate-400">Loading orders…</p>
      )}

      {!ordersLoading && shopOrders.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center text-sm text-slate-400">
          No orders yet.
        </div>
      )}

      {!ordersLoading && shopOrders.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center text-xs text-slate-400">
          No orders match your filters.
        </div>
      )}

      {paginated.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs text-slate-200 hover:border-slate-700 hover:bg-slate-800/60 transition-colors cursor-pointer"
          onClick={() => onOrderClick(order)}
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-50">
                {order.client?.name || order.client?.email}
              </span>
              <span className="text-slate-500">→</span>
              <span className="text-slate-300">{order.shopItem?.title}</span>
              <OrderStatusBadge status={order.status} />
              {order.shopItem?.itemType === "rental" && (
                <span className="rounded-full bg-amber-950/40 border border-amber-600/30 px-1.5 py-0.5 text-[10px] text-amber-300">
                  rental
                </span>
              )}
            </div>
            <span className="text-slate-400">
              {order.quantity} ×{" "}
              {formatPrice(order.shopItem?.priceCents, order.currency)} ={" "}
              <span className="text-slate-300 font-medium">
                {formatPrice(order.totalCents, order.currency)}
              </span>{" "}
              ·{" "}
              {new Date(order.createdAt).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {order.rentalDueDate && (
                <span
                  className={`ml-2 ${new Date(order.rentalDueDate) < new Date() && order.status === "paid" ? "text-rose-400 font-semibold" : "text-slate-400"}`}
                >
                  · Due: {order.rentalDueDate}
                  {new Date(order.rentalDueDate) < new Date() &&
                    order.status === "paid" &&
                    " ⚠ overdue"}
                </span>
              )}
              {order.rentalAgreementAcceptedAt && (
                <span className="ml-1 text-emerald-400">· Agreement ✓</span>
              )}
            </span>
          </div>

          <div className="flex shrink-0 items-center">
            <svg
              className="h-3.5 w-3.5 text-slate-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      ))}

      <Paginator
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={setPageSize}
      />
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function OwnerShopPage() {
  useDocumentTitle("Shop Management");
  const { addToast } = useToast();

  const { data: userData, loading: userLoading } = useQuery(CURRENT_USER);
  const user = userData?.currentUser;

  const canManage = isOwner(user) || isStaff(user);

  const { data: paymentData, loading: paymentLoading } = useQuery(
    PAYMENT_SETTINGS,
    {
      skip: !canManage,
      fetchPolicy: "cache-and-network",
    },
  );
  const stripeConfigured = paymentData?.paymentSettings?.configured;

  const {
    data: itemsData,
    loading: itemsLoading,
    refetch: refetchItems,
  } = useQuery(SHOP_ITEMS, {
    skip: !canManage || !stripeConfigured,
    fetchPolicy: "cache-and-network",
  });

  const {
    data: ordersData,
    loading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery(SHOP_ORDERS, {
    skip: !canManage || !stripeConfigured,
    fetchPolicy: "cache-and-network",
  });

  const [createShopItem] = useMutation(CREATE_SHOP_ITEM);
  const [updateShopItem] = useMutation(UPDATE_SHOP_ITEM);
  const [deleteShopItem] = useMutation(DELETE_SHOP_ITEM);
  const [updateShopOrder] = useMutation(UPDATE_SHOP_ORDER);

  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [orderNavKey, setOrderNavKey] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Called from chart popover: specific order → modal, null → Orders tab
  const navigateToOrder = (order) => {
    if (order) {
      setSelectedOrder(order);
    } else {
      setOrderNavKey((k) => k + 1);
      setTab("orders");
    }
  };

  // When a status action fires inside the modal, propagate and refresh modal state
  const handleModalStatusChange = async (order, status) => {
    await handleOrderStatus(order, status);
    // Update the modal with new status so the footer updates immediately
    setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
  };

  if (userLoading || paymentLoading) {
    return <div className="text-sm text-slate-300">Loading…</div>;
  }

  if (!user) return <Navigate to="/signin" replace />;

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400">
        Shop management is for studio owners and staff only.
      </div>
    );
  }

  if (!stripeConfigured) {
    return (
      <div className="rounded-2xl border border-amber-800/40 bg-amber-950/30 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-900/50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-base font-semibold text-amber-300">
          Stripe not configured
        </h3>
        <p className="mx-auto max-w-sm text-sm text-amber-200/70">
          The shop requires Stripe to process payments. Configure your Stripe
          secret and publishable keys in{" "}
          <a href="/owner/settings" className="underline hover:text-amber-200">
            Owner Settings → Payments
          </a>{" "}
          to enable the shop.
        </p>
      </div>
    );
  }

  const shopItems = itemsData?.shopItems || [];
  const shopOrders = ordersData?.shopOrders || [];

  const handleCreate = async ({
    priceCents,
    stockQuantity,
    priceDollars: _pd,
    ...attrs
  }) => {
    const res = await createShopItem({
      variables: { ...attrs, priceCents, stockQuantity },
    });

    const payload = res.data?.createShopItem;
    const errors = payload?.errors || [];
    if (errors.length) {
      addToast({ type: "error", message: errors[0] });
    } else {
      addToast({ type: "success", message: "Item created" });
      setShowNewForm(false);
      refetchItems();
    }
  };

  const handleUpdate =
    (item) =>
    async ({ priceCents, stockQuantity, priceDollars: _pd, ...attrs }) => {
      const res = await updateShopItem({
        variables: { id: item.id, ...attrs, priceCents, stockQuantity },
      });

      const payload = res.data?.updateShopItem;
      const errors = payload?.errors || [];
      if (errors.length) {
        addToast({ type: "error", message: errors[0] });
      } else {
        addToast({ type: "success", message: "Item updated" });
        setEditingId(null);
        refetchItems();
      }
    };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`))
      return;

    const res = await deleteShopItem({ variables: { id: item.id } });
    const payload = res.data?.deleteShopItem;

    if (!payload?.success) {
      addToast({
        type: "error",
        message: payload?.errors?.[0] || "Could not delete item",
      });
    } else {
      addToast({ type: "success", message: "Item deleted" });
      refetchItems();
    }
  };

  const handleOrderStatus = async (order, status) => {
    const res = await updateShopOrder({ variables: { id: order.id, status } });
    const payload = res.data?.updateShopOrder;
    const errors = payload?.errors || [];
    if (errors.length) {
      addToast({ type: "error", message: errors[0] });
    } else {
      addToast({ type: "success", message: `Order marked as ${status}` });
      refetchOrders();
    }
  };

  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "items", label: `Items (${shopItems.length})` },
    { key: "orders", label: `Orders (${shopOrders.length})` },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Shop Management
        </h1>
        <p className="text-sm text-slate-400">
          Sales analytics, inventory, and order management for your studio shop.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1 w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition ${
              tab === key
                ? "bg-sky-500 text-on-accent"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && (
        <DashboardTab
          shopItems={shopItems}
          shopOrders={shopOrders}
          onOrderClick={navigateToOrder}
        />
      )}

      {tab === "items" && (
        <ItemsTab
          shopItems={shopItems}
          itemsLoading={itemsLoading}
          onEdit={setEditingId}
          onDelete={handleDelete}
          editingId={editingId}
          onCancelEdit={() => setEditingId(null)}
          onUpdate={handleUpdate}
          onCreate={handleCreate}
          showNewForm={showNewForm}
          onToggleNew={() => setShowNewForm((v) => !v)}
        />
      )}

      {tab === "orders" && (
        <OrdersTab
          key={orderNavKey}
          shopOrders={shopOrders}
          ordersLoading={ordersLoading}
          onStatusChange={handleOrderStatus}
          onOrderClick={setSelectedOrder}
        />
      )}

      {selectedOrder && (
        <OrderModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleModalStatusChange}
        />
      )}
    </div>
  );
}
