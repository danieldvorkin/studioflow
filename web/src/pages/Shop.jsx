import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useMutation, useQuery } from "@apollo/client";
import { Navigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  CURRENT_USER,
  SHOP_ITEMS,
  MY_PAYMENT_METHODS,
  PAYMENT_PUBLIC_SETTINGS,
} from "../apollo/queries";
import { CREATE_SHOP_ORDER } from "../apollo/mutations";
import { useToast } from "../components/ToastProvider";
import { useStudio } from "../studio/StudioProvider";
import CheckoutModal from "../components/shop/CheckoutModal";
import RentalWizard from "../components/shop/RentalWizard";

function formatCents(cents, currency = "cad") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function ItemTypeBadge({ type }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${
        type === "rental"
          ? "border border-amber-500/40 bg-amber-950/40 text-amber-300"
          : "border border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
      }`}
    >
      {type}
    </span>
  );
}

function ShopItemCard({ item, onSelect }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-black/20">
      {item.imageUrl && (
        <div className="mb-3 overflow-hidden rounded-xl">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-40 w-full object-cover"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-50">{item.title}</h3>
          {item.description && (
            <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
        <ItemTypeBadge type={item.itemType} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-lg font-bold text-sky-400">
          {formatCents(item.priceCents, item.currency)}
        </span>
        {item.stockQuantity !== null && (
          <span
            className={`text-[11px] ${item.inStock ? "text-slate-400" : "text-rose-400 font-semibold"}`}
          >
            {item.inStock ? `${item.stockQuantity} left` : "Out of stock"}
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={!item.inStock}
        onClick={() => onSelect(item)}
        className={`mt-3 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          item.itemType === "rental"
            ? "bg-amber-500 text-slate-900 hover:bg-amber-400"
            : "bg-sky-500 text-on-accent hover:bg-sky-400"
        }`}
      >
        {item.inStock
          ? item.itemType === "rental"
            ? "Rent this item →"
            : "Buy now →"
          : "Out of stock"}
      </button>
    </div>
  );
}

export default function ShopPage() {
  useDocumentTitle("Shop");
  const { addToast } = useToast();
  const { selectedStudioId } = useStudio();

  // Track whether this is the initial load to suppress the toast on first render.
  const isFirstRender = useRef(true);
  // useState instead of useRef so we can safely compare during render.
  const [prevStudioId, setPrevStudioId] = useState(selectedStudioId);

  const { data: userData, loading: userLoading } = useQuery(CURRENT_USER);
  const user = userData?.currentUser;

  const { data: paymentSettingsData } = useQuery(PAYMENT_PUBLIC_SETTINGS, {
    skip: !user || !selectedStudioId,
    variables: { studioId: selectedStudioId },
    fetchPolicy: "cache-first",
  });
  const stripePublishableKey =
    paymentSettingsData?.paymentPublicSettings?.stripePublishableKey;
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  );

  const { data: paymentMethodsData } = useQuery(MY_PAYMENT_METHODS, {
    skip: !user,
    fetchPolicy: "cache-and-network",
  });
  const savedMethods = paymentMethodsData?.myPaymentMethods || [];

  const { data, loading, refetch } = useQuery(SHOP_ITEMS, {
    skip: !user || !selectedStudioId,
    variables: { studioId: selectedStudioId },
    fetchPolicy: "cache-and-network",
  });

  const [createShopOrder] = useMutation(CREATE_SHOP_ORDER);

  const [filter, setFilter] = useState("all"); // all | sale | rental
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  // Reset filters whenever the selected studio changes (derived state during render).
  if (prevStudioId !== selectedStudioId) {
    setPrevStudioId(selectedStudioId);
    if (selectedStudioId) {
      setFilter("all");
      setSearch("");
      setSelectedItem(null);
    }
  }

  // Show a toast when the loaded studio has no shop items.
  // Suppressed on the very first load so the empty-state UI speaks for itself.
  useEffect(() => {
    if (loading) return;
    if (!data) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (data.shopItems.length === 0) {
      addToast({
        type: "info",
        message: "This studio has no shop yet — check back later!",
      });
    }
  }, [selectedStudioId, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (userLoading) {
    return <div className="text-sm text-slate-300">Loading…</div>;
  }

  if (!user) return <Navigate to="/signin" replace />;

  const allItems = data?.shopItems || [];
  const items = allItems.filter((item) => {
    if (filter !== "all" && item.itemType !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOrder = async ({
    quantity,
    rentalDueDate,
    rentalAgreementAcceptedAt,
    paymentMethodId,
  }) => {
    const item = selectedItem;
    const res = await createShopOrder({
      variables: {
        shopItemId: item.id,
        quantity,
        rentalDueDate: rentalDueDate || undefined,
        rentalAgreementAcceptedAt: rentalAgreementAcceptedAt || undefined,
        paymentMethodId: paymentMethodId || undefined,
      },
    });

    const payload = res.data?.createShopOrder;
    const errors = payload?.errors || [];

    if (errors.length) {
      // Bubble errors up so the modal overlay can catch them
      throw new Error(errors[0]);
    } else {
      refetch();
    }
  };

  return (
    <>
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Shop
          </h1>
          <p className="text-sm text-slate-400">
            Browse items available for purchase or rental from the studio.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-56 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          <div className="flex items-center gap-1">
            {["all", "sale", "rental"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                  filter === f
                    ? "bg-sky-500 text-on-accent"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="text-sm text-slate-400">Loading shop items…</p>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center text-sm text-slate-400">
            {allItems.length === 0
              ? "No items are available in the shop yet."
              : "No items match your filters."}
          </div>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ShopItemCard
                key={item.id}
                item={item}
                onSelect={setSelectedItem}
              />
            ))}
          </div>
        )}
      </div>

      {selectedItem?.itemType === "sale" && (
        <CheckoutModal
          item={selectedItem}
          onConfirm={handleOrder}
          onClose={() => setSelectedItem(null)}
          stripePromise={stripePromise}
          savedMethods={savedMethods}
        />
      )}

      {selectedItem?.itemType === "rental" && (
        <RentalWizard
          item={selectedItem}
          onConfirm={handleOrder}
          onClose={() => setSelectedItem(null)}
          stripePromise={stripePromise}
          savedMethods={savedMethods}
        />
      )}
    </>
  );
}
