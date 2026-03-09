import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Navigate } from "react-router-dom";
import {
  Elements,
  CardElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useAuth } from "../../auth/AuthProvider";
import { useStudio } from "../../studio/StudioProvider";
import {
  BUNDLE_SHOP_PRODUCTS,
  MY_BUNDLE_PURCHASES,
  MY_CLIENT,
  PAYMENT_PUBLIC_SETTINGS,
} from "../../apollo/queries";
import { PURCHASE_BUNDLE_PRODUCT } from "../../apollo/mutations";
import { useToast } from "../../components/shared/ToastProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { getStripeCardElementOptions } from "../../theme/stripeElements";
import { normalizeStripeEmail } from "../../payments/stripeEmail";

function currencySymbol(currency) {
  const c = (currency || "cad").toString().toLowerCase();
  if (c === "usd") return "$";
  return "CA$";
}

function dollarsFromCents(cents) {
  if (typeof cents !== "number") return "";
  return (cents / 100).toFixed(2);
}

function PurchaseBundleCard({
  bundleProduct,
  myClient,
  stripeConfigured,
  stripeAvailable,
  onPurchased,
  cardElementOptions,
}) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const stripe = useStripe();
  const elements = useElements();
  const [purchaseBundleProduct] = useMutation(PURCHASE_BUNDLE_PRODUCT);

  const savedMethods = myClient?.clientPaymentMethods || [];
  const defaultSavedMethodId =
    savedMethods.find((m) => m.default)?.stripePaymentMethodId ||
    myClient?.stripeDefaultPaymentMethodId ||
    "";

  const [expanded, setExpanded] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState("saved");
  const [selectedSavedPaymentMethodId, setSelectedSavedPaymentMethodId] =
    useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedSavedPaymentMethodId && defaultSavedMethodId) {
      setSelectedSavedPaymentMethodId(defaultSavedMethodId);
    }
  }, [defaultSavedMethodId, selectedSavedPaymentMethodId]);

  const canUseSaved = savedMethods.length > 0;
  const canUseNewCard = stripeAvailable === true;

  useEffect(() => {
    if (!canUseSaved && paymentChoice === "saved") setPaymentChoice("new");
  }, [canUseSaved, paymentChoice]);

  useEffect(() => {
    if (!canUseNewCard && paymentChoice === "new") setPaymentChoice("saved");
  }, [canUseNewCard, paymentChoice]);

  const onBuy = async (e) => {
    e.preventDefault();
    try {
      if (submitting) return;
      setSubmitting(true);

      if (!stripeConfigured) {
        throw new Error(
          "Payments aren’t configured yet. Please ask the studio owner to enable Stripe.",
        );
      }

      let paymentMethodIdToUse = null;

      if (paymentChoice === "saved") {
        if (!canUseSaved) throw new Error("No saved card on file");
        if (!selectedSavedPaymentMethodId)
          throw new Error("Please choose a saved card");
        const isKnown = savedMethods.some(
          (m) => m.stripePaymentMethodId === selectedSavedPaymentMethodId,
        );
        if (!isKnown) throw new Error("Selected saved card is not available");
        paymentMethodIdToUse = selectedSavedPaymentMethodId;
      } else {
        if (!stripe || !elements)
          throw new Error("Payment form is not ready yet");
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) throw new Error("Payment details are missing");

        const { paymentMethod, error: pmError } =
          await stripe.createPaymentMethod({
            type: "card",
            card: cardElement,
            billing_details: {
              name: user?.name || undefined,
              email: normalizeStripeEmail(user?.email),
            },
          });

        if (pmError || !paymentMethod) {
          throw new Error(
            pmError?.message || "Payment method could not be created",
          );
        }

        paymentMethodIdToUse = paymentMethod.id;
      }

      const res = await purchaseBundleProduct({
        variables: {
          bundleProductId: bundleProduct.id,
          clientId: null,
          paymentMethodId: paymentMethodIdToUse,
        },
      });

      const payload = res.data?.purchaseBundleProduct;
      const errors = payload?.errors || [];
      if (errors.length || !payload?.bundlePurchase)
        throw new Error(errors.join(", ") || "Purchase failed");

      addToast({ message: "Bundle purchased", type: "success" });
      setExpanded(false);
      onPurchased?.();
    } catch (err) {
      addToast({
        message: err.message || "Could not purchase bundle",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-50">
            {bundleProduct.title}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            {bundleProduct.creditsCount} credits •{" "}
            {currencySymbol(bundleProduct.currency)}
            {dollarsFromCents(bundleProduct.priceCents)}
            {bundleProduct.classTemplate?.title
              ? ` • ${bundleProduct.classTemplate.title}`
              : ""}
            {bundleProduct.instructor?.name
              ? ` • ${bundleProduct.instructor.name}`
              : ""}
          </div>
          {bundleProduct.description && (
            <div className="mt-2 text-xs text-slate-300">
              {bundleProduct.description}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          disabled={!stripeConfigured}
          className="shrink-0 rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-on-accent hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {expanded ? "Cancel" : "Buy"}
        </button>
      </div>

      {expanded && (
        <form onSubmit={onBuy} className="mt-4 space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
              Payment
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200">
                <input
                  type="radio"
                  name={`pay-${bundleProduct.id}`}
                  checked={paymentChoice === "saved"}
                  disabled={!canUseSaved}
                  onChange={() => setPaymentChoice("saved")}
                />
                Saved card
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200">
                <input
                  type="radio"
                  name={`pay-${bundleProduct.id}`}
                  checked={paymentChoice === "new"}
                  disabled={!canUseNewCard}
                  onChange={() => setPaymentChoice("new")}
                />
                New card
              </label>
            </div>
          </div>

          {paymentChoice === "saved" && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-300">
                Saved card
              </label>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                value={selectedSavedPaymentMethodId}
                onChange={(e) =>
                  setSelectedSavedPaymentMethodId(e.target.value)
                }
                disabled={!canUseSaved}
              >
                {!canUseSaved && <option value="">No saved card</option>}
                {savedMethods.map((m) => (
                  <option key={m.id} value={m.stripePaymentMethodId}>
                    {(m.brand || "card").toString().toUpperCase()} ••••{" "}
                    {m.last4}
                    {m.default ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <div className="text-xs text-slate-500">
                Manage saved cards in Profile.
              </div>
            </div>
          )}

          {paymentChoice === "new" && canUseNewCard && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Card details
              </label>
              <div className="rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2">
                <CardElement options={cardElementOptions} />
              </div>
            </div>
          )}

          {paymentChoice === "new" && !canUseNewCard && (
            <div className="text-xs text-slate-400">
              New-card checkout is unavailable right now. Add a saved card in
              Profile, or try again later.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-on-accent hover:bg-sky-400 disabled:opacity-60"
          >
            {submitting ? "Purchasing…" : "Confirm purchase"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function MyBundlesPage() {
  useDocumentTitle("My Bundles");
  const { user } = useAuth();
  const role = (user?.roleName || "").toString().toLowerCase();

  const isClient = role === "client" || user?.role === 2;

  const { selectedStudioId } = useStudio();
  const { addToast } = useToast();
  const { theme } = useTheme();
  const cardElementOptions = useMemo(
    () => getStripeCardElementOptions(theme),
    [theme],
  );

  const { data: paymentSettingsData, loading: paymentSettingsLoading } =
    useQuery(PAYMENT_PUBLIC_SETTINGS, {
      variables: { studioId: selectedStudioId || null },
      skip: !selectedStudioId,
    });

  const stripePublishableKey =
    paymentSettingsData?.paymentPublicSettings?.stripePublishableKey || null;
  const stripeConfigured =
    paymentSettingsData?.paymentPublicSettings?.configured === true;

  const stripePromise = useMemo(() => {
    if (!stripePublishableKey) return null;
    try {
      return loadStripe(stripePublishableKey);
    } catch {
      return null;
    }
  }, [stripePublishableKey]);

  const stripeAvailable = !!stripePromise;

  const {
    data: myClientData,
    loading: myClientLoading,
    refetch: refetchMyClient,
  } = useQuery(MY_CLIENT, {
    skip: !user || !selectedStudioId,
    variables: selectedStudioId ? { studioId: selectedStudioId } : {},
    fetchPolicy: "cache-and-network",
  });

  const myClient = myClientData?.myClient;

  const {
    data: purchasesData,
    loading: purchasesLoading,
    refetch: refetchPurchases,
  } = useQuery(MY_BUNDLE_PURCHASES, {
    skip: !user,
    variables: selectedStudioId ? { studioId: selectedStudioId } : {},
    fetchPolicy: "cache-and-network",
  });

  const bundlePurchases = purchasesData?.myBundlePurchases || [];

  const {
    data: shopData,
    loading: shopLoading,
    refetch: refetchShop,
  } = useQuery(BUNDLE_SHOP_PRODUCTS, {
    skip: !user || !selectedStudioId,
    variables: selectedStudioId
      ? { studioId: selectedStudioId }
      : { studioId: "0" },
    fetchPolicy: "cache-and-network",
  });

  const shopProducts = (shopData?.bundleShopProducts || []).filter(
    (bp) => bp?.active !== false,
  );

  const onPurchased = async () => {
    try {
      await Promise.all([
        refetchPurchases?.(),
        refetchShop?.(),
        refetchMyClient?.(),
      ]);
    } catch (e) {
      addToast({
        message: e.message || "Could not refresh bundles",
        type: "error",
      });
    }
  };

  if (!user) return <Navigate to="/signin" replace />;

  if (!isClient) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!selectedStudioId) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-200">
        <h1 className="mb-2 text-lg font-semibold text-slate-50">Bundles</h1>
        <p className="text-sm text-slate-400">
          Select a studio first to view and purchase bundles.
        </p>
      </div>
    );
  }

  const content = (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Bundles
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Use bundles to book eligible classes using credits.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
            My credits
          </h2>
          {(purchasesLoading || myClientLoading) && (
            <span className="text-[11px] text-slate-500">Loading…</span>
          )}
        </div>

        {!purchasesLoading && bundlePurchases.length === 0 && (
          <p className="mt-2 text-sm text-slate-400">No active bundles yet.</p>
        )}

        {!purchasesLoading && bundlePurchases.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {bundlePurchases.map((bp) => (
              <div
                key={bp.id}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
              >
                <div className="text-sm font-semibold text-slate-50">
                  {bp.bundleProduct?.title || "Bundle"}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {bp.creditsRemaining} / {bp.creditsTotal} credits remaining
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-400">
              Buy a bundle
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a bundle for this studio.
            </p>
          </div>
          {paymentSettingsLoading && (
            <span className="text-[11px] text-slate-500">
              Loading payments…
            </span>
          )}
        </div>

        {!paymentSettingsLoading && !stripePublishableKey && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-amber-300">
            Payments aren’t configured yet. Please ask the studio owner to
            enable Stripe.
          </div>
        )}

        {shopLoading && (
          <p className="text-sm text-slate-400">Loading bundles…</p>
        )}

        {!shopLoading && shopProducts.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
            No bundles available right now.
          </div>
        )}

        {!shopLoading && shopProducts.length > 0 && (
          <div className="grid gap-3">
            {shopProducts.map((bundleProduct) => (
              <PurchaseBundleCard
                key={bundleProduct.id}
                bundleProduct={bundleProduct}
                myClient={myClient}
                stripeConfigured={stripeConfigured}
                stripeAvailable={stripeAvailable}
                onPurchased={onPurchased}
                cardElementOptions={cardElementOptions}
              />
            ))}
          </div>
        )}

        <div className="text-xs text-slate-500">
          Tip: you can add or change your default card in Profile.
        </div>
      </section>
    </div>
  );

  return <Elements stripe={stripePromise}>{content}</Elements>;
}
