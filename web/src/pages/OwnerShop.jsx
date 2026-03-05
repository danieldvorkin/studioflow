import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMutation, useQuery } from "@apollo/client";
import { Navigate } from "react-router-dom";
import { useState } from "react";
import {
  CURRENT_USER,
  PAYMENT_SETTINGS,
  SHOP_ITEMS,
  SHOP_ORDERS,
} from "../apollo/queries";
import {
  CREATE_SHOP_ITEM,
  UPDATE_SHOP_ITEM,
  DELETE_SHOP_ITEM,
  UPDATE_SHOP_ORDER,
} from "../apollo/mutations";
import { useToast } from "../components/ToastProvider";
import { isOwner, isStaff } from "../auth/permissions";

function formatCents(cents, currency = "cad") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

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
  const [tab, setTab] = useState("items"); // items | orders

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

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Shop Management
        </h1>
        <p className="text-sm text-slate-400">
          Manage items available for sale or rental in the studio shop.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1 w-fit">
        {[
          { key: "items", label: `Items (${shopItems.length})` },
          { key: "orders", label: `Orders (${shopOrders.length})` },
        ].map(({ key, label }) => (
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

      {/* Items tab */}
      {tab === "items" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowNewForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-on-accent hover:bg-sky-400"
            >
              {showNewForm ? "Cancel" : "+ Add item"}
            </button>
          </div>

          {showNewForm && (
            <ItemForm
              onSubmit={handleCreate}
              onCancel={() => setShowNewForm(false)}
              submitLabel="Create item"
            />
          )}

          {itemsLoading && (
            <p className="text-sm text-slate-400">Loading items…</p>
          )}

          {!itemsLoading && shopItems.length === 0 && !showNewForm && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center text-sm text-slate-400">
              No shop items yet. Add one above to get started.
            </div>
          )}

          <div className="flex flex-col gap-3">
            {shopItems.map((item) =>
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
                  onSubmit={handleUpdate(item)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Save changes"
                />
              ) : (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs text-slate-200"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
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
                    </div>
                    <span className="text-slate-400">
                      {formatCents(item.priceCents, item.currency)} ·{" "}
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
                      onClick={() => setEditingId(item.id)}
                      className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="rounded-full border border-rose-700/50 px-3 py-1 text-[11px] text-rose-400 hover:bg-rose-950/40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Orders tab */}
      {tab === "orders" && (
        <div className="flex flex-col gap-3">
          {ordersLoading && (
            <p className="text-sm text-slate-400">Loading orders…</p>
          )}

          {!ordersLoading && shopOrders.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center text-sm text-slate-400">
              No orders yet.
            </div>
          )}

          {shopOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-xs text-slate-200"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-50">
                    {order.client?.name || order.client?.email}
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="text-slate-300">
                    {order.shopItem?.title}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <span className="text-slate-400">
                  {order.quantity} ×{" "}
                  {formatCents(order.shopItem?.priceCents, order.currency)} ={" "}
                  {formatCents(order.totalCents, order.currency)} ·{" "}
                  {new Date(order.createdAt).toLocaleDateString()}
                  {order.rentalDueDate && ` · Due: ${order.rentalDueDate}`}
                  {order.rentalAgreementAcceptedAt && (
                    <span className="ml-1 text-emerald-400">· Agreement ✓</span>
                  )}
                </span>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1">
                {order.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOrderStatus(order, "paid")}
                      className="rounded-full bg-emerald-600/80 px-3 py-1 text-[11px] font-semibold text-emerald-50 hover:bg-emerald-500"
                    >
                      Mark paid
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOrderStatus(order, "cancelled")}
                      className="rounded-full border border-rose-700/50 px-3 py-1 text-[11px] text-rose-400 hover:bg-rose-950/40"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {order.status === "paid" &&
                  order.shopItem?.itemType === "rental" && (
                    <button
                      type="button"
                      onClick={() => handleOrderStatus(order, "returned")}
                      className="rounded-full border border-amber-600/50 px-3 py-1 text-[11px] text-amber-300 hover:bg-amber-950/40"
                    >
                      Mark returned
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
