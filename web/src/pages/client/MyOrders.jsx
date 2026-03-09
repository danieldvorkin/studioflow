import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useQuery, useMutation } from "@apollo/client";
import { Navigate } from "react-router-dom";
import { useState } from "react";
import { CURRENT_USER, MY_SHOP_ORDERS } from "../../apollo/queries";
import { UPDATE_SHOP_ORDER } from "../../apollo/mutations";
import { useToast } from "../../components/shared/ToastProvider";
import { useCurrency } from "../../currency/CurrencyProvider";

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
  paid: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  cancelled: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
  returned: "bg-slate-500/10 text-slate-400 border border-slate-500/30",
};

const TYPE_STYLES = {
  sale: "border border-emerald-500/30 bg-emerald-950/30 text-emerald-300",
  rental: "border border-amber-500/30 bg-amber-950/30 text-amber-300",
};

const addDays = (iso, n) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function RentalActions({ order, onUpdate }) {
  const isActive = ["pending", "paid"].includes(order.status);
  const isOverdue =
    order.rentalDueDate &&
    new Date(order.rentalDueDate + "T00:00:00") < new Date() &&
    order.status !== "returned";

  const [extending, setExtending] = useState(false);
  const [extendDays, setExtendDays] = useState(7);
  const [busy, setBusy] = useState(false);

  if (!isActive) return null;

  return (
    <div className="mt-3 border-t border-slate-800 pt-3">
      {isOverdue && (
        <p className="mb-2 text-xs font-medium text-rose-400">
          ⚠ This rental is overdue. Please return or request an extension.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Early return */}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm("Mark this rental as returned?")) return;
            setBusy(true);
            await onUpdate(order.id, {
              status: "returned",
              returnedAt: new Date().toISOString().slice(0, 10),
            });
            setBusy(false);
          }}
          className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          ↩ Early return
        </button>

        {/* Extend */}
        {extending ? (
          <div className="flex items-center gap-2">
            <select
              value={extendDays}
              onChange={(e) => setExtendDays(Number(e.target.value))}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
            >
              {[3, 7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const base =
                  order.rentalDueDate || new Date().toISOString().slice(0, 10);
                const newDate = addDays(base, extendDays);
                await onUpdate(order.id, { rentalDueDate: newDate });
                setExtending(false);
                setBusy(false);
              }}
              className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
            >
              Confirm extension
            </button>
            <button
              type="button"
              onClick={() => setExtending(false)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExtending(true)}
            className="rounded-full border border-amber-700/40 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-950/60"
          >
            ⟳ Extend rental
          </button>
        )}
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  useDocumentTitle("My Orders");
  const { addToast } = useToast();
  const { formatPrice } = useCurrency();

  const { data: userData, loading: userLoading } = useQuery(CURRENT_USER);
  const user = userData?.currentUser;

  const { data, loading, refetch } = useQuery(MY_SHOP_ORDERS, {
    skip: !user,
    fetchPolicy: "cache-and-network",
  });

  const [updateShopOrder] = useMutation(UPDATE_SHOP_ORDER);

  const handleUpdate = async (id, vars) => {
    const res = await updateShopOrder({ variables: { id, ...vars } });
    const errors = res.data?.updateShopOrder?.errors || [];
    if (errors.length) {
      addToast({ type: "error", message: errors[0] });
    } else {
      addToast({ type: "success", message: "Rental updated." });
      refetch();
    }
  };

  if (userLoading)
    return <div className="text-sm text-slate-300">Loading…</div>;
  if (!user) return <Navigate to="/signin" replace />;

  const orders = data?.myShopOrders || [];

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          My Orders
        </h1>
        <p className="text-sm text-slate-400">
          Your shop order history — purchases and rentals.
        </p>
      </header>

      {loading && orders.length === 0 && (
        <div className="text-sm text-slate-400">Loading orders…</div>
      )}

      {!loading && orders.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
          <p className="text-sm text-slate-400">No orders yet.</p>
          <a
            href="/shop"
            className="mt-3 inline-block text-xs font-semibold text-sky-400 hover:underline"
          >
            Browse the shop →
          </a>
        </div>
      )}

      {orders.length > 0 && (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const item = order.shopItem;
            const statusClass =
              STATUS_STYLES[order.status] || STATUS_STYLES.pending;
            const typeClass = TYPE_STYLES[item.itemType] || TYPE_STYLES.sale;
            const isOverdue =
              order.rentalDueDate &&
              new Date(order.rentalDueDate + "T00:00:00") < new Date() &&
              order.status !== "returned";

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {/* Item image or emoji */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800 text-2xl">
                      {item.itemType === "rental" ? "📦" : "🛍️"}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-50 truncate">
                        {item.title}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${typeClass}`}
                      >
                        {item.itemType}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusClass}`}
                      >
                        {order.status}
                      </span>
                      {isOverdue && (
                        <span className="inline-flex items-center rounded-full border border-rose-500/40 bg-rose-950/30 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                          Overdue
                        </span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-4">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                          Qty
                        </span>
                        <span className="text-slate-200">{order.quantity}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                          Total
                        </span>
                        <span className="font-semibold text-sky-400">
                          {formatPrice(order.totalCents, order.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                          Ordered
                        </span>
                        <span className="text-slate-200">
                          {formatDate(order.createdAt)}
                        </span>
                      </div>
                      {order.rentalDueDate && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                            Return by
                          </span>
                          <span
                            className={`font-medium ${isOverdue ? "text-rose-400" : "text-amber-300"}`}
                          >
                            {formatDate(order.rentalDueDate + "T00:00:00")}
                          </span>
                        </div>
                      )}
                      {order.returnedAt && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider text-slate-500">
                            Returned
                          </span>
                          <span className="text-emerald-400">
                            {formatDate(order.returnedAt + "T00:00:00")}
                          </span>
                        </div>
                      )}
                    </div>

                    {order.notes && (
                      <p className="mt-2 text-xs text-slate-500 italic">
                        Note: {order.notes}
                      </p>
                    )}

                    {order.rentalAgreementAcceptedAt && (
                      <p className="mt-1 text-[11px] text-emerald-500">
                        ✓ Rental agreement accepted
                      </p>
                    )}

                    {/* Rental progress actions */}
                    {item.itemType === "rental" && (
                      <RentalActions order={order} onUpdate={handleUpdate} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
