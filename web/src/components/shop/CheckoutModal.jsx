import { useState } from "react";
import {
  Elements,
  CardElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { getStripeCardElementOptions } from "../../theme/stripeElements";
import SuccessOverlay from "./SuccessOverlay";

function formatCents(cents, currency = "cad") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

const STEPS = ["Details", "Payment", "Review"];

/**
 * Inner — must be inside an <Elements> provider.
 */
function CheckoutModalInner({ item, onConfirm, onClose, savedMethods }) {
  const stripe = useStripe();
  const elements = useElements();

  const [step, setStep] = useState(1);
  const [qty, setQty] = useState(1);
  // Derive payment choice and selected method from savedMethods during render.
  // The override variables track explicit user selections; when null the value
  // is derived from the current savedMethods list automatically.
  const [paymentChoiceOverride, setPaymentChoice] = useState(null);
  const paymentChoice =
    paymentChoiceOverride ?? (savedMethods.length > 0 ? "saved" : "new");

  const [selectedMethodIdOverride, setSelectedMethodId] = useState(null);
  const selectedMethodId =
    selectedMethodIdOverride ||
    savedMethods.find((m) => m.default)?.stripePaymentMethodId ||
    savedMethods[0]?.stripePaymentMethodId ||
    "";
  const [cardError, setCardError] = useState("");
  const [overlayStatus, setOverlayStatus] = useState(null);
  const [overlayMsg, setOverlayMsg] = useState("");
  const [pendingPaymentMethodId, setPendingPaymentMethodId] = useState(null);

  const maxQty = item.stockQuantity ?? 99;
  const total = item.priceCents * qty;

  const handleConfirm = async () => {
    setCardError("");
    let paymentMethodId = null;

    if (item.priceCents > 0) {
      if (paymentChoice === "saved") {
        paymentMethodId = selectedMethodId;
        if (!paymentMethodId) {
          setCardError("Please select a payment method.");
          return;
        }
      } else {
        paymentMethodId = pendingPaymentMethodId;
        if (!paymentMethodId) {
          setCardError(
            "Card details are missing. Please go back and re-enter your card.",
          );
          return;
        }
      }
    }

    setOverlayStatus("loading");
    setOverlayMsg("Processing your order…");
    try {
      await onConfirm({ quantity: qty, paymentMethodId });
      setOverlayStatus("success");
      setOverlayMsg(`Order placed for "${item.title}"!`);
      setTimeout(onClose, 2200);
    } catch {
      setOverlayStatus("error");
      setOverlayMsg("Something went wrong. Please try again.");
      setTimeout(() => setOverlayStatus(null), 2500);
    }
  };

  return (
    <>
      {overlayStatus && (
        <SuccessOverlay status={overlayStatus} message={overlayMsg} />
      )}

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        onClick={(e) =>
          e.target === e.currentTarget && !overlayStatus && onClose()
        }
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-100">Checkout</h2>
              <div className="hidden sm:flex items-center gap-1 text-[11px]">
                {STEPS.map((label, i) => (
                  <span
                    key={label}
                    className={`flex items-center gap-1 ${i + 1 === step ? "text-sky-400 font-semibold" : i + 1 < step ? "text-slate-500" : "text-slate-600"}`}
                  >
                    {i > 0 && <span className="text-slate-700 mx-0.5">›</span>}
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex sm:hidden items-center gap-1">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-5 rounded-full transition-colors ${i + 1 <= step ? "bg-sky-500" : "bg-slate-700"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <span className="sr-only">Close</span>
              <CloseIcon />
            </button>
          </div>

          {/* ── Step 1: Item details + qty ─── */}
          {step === 1 && (
            <div className="flex flex-col gap-5 p-5">
              <div className="flex items-start gap-3">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-slate-800 text-2xl">
                    🛍️
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-50">{item.title}</p>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-semibold text-sky-400">
                    {formatCents(item.priceCents, item.currency)} each
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                <span className="text-xs text-slate-300">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-300 hover:bg-slate-700"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold text-slate-100">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-300 hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {item.stockQuantity !== null && (
                <p className="text-[11px] text-center text-slate-500">
                  {item.stockQuantity} unit{item.stockQuantity !== 1 ? "s" : ""}{" "}
                  remaining in stock
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: Payment method ─── */}
          {step === 2 && (
            <div className="flex flex-col gap-4 p-5">
              <h3 className="text-xs font-semibold text-slate-200">Payment</h3>

              {item.priceCents === 0 ? (
                <p className="text-sm text-emerald-400 font-medium text-center py-3">
                  This item is free — no payment required.
                </p>
              ) : (
                <>
                  <div className="flex gap-2">
                    {savedMethods.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentChoice("saved")}
                        className={`flex-1 rounded-full py-1.5 text-xs font-medium transition ${paymentChoice === "saved" ? "bg-sky-500 text-white" : "border border-slate-700 text-slate-300 hover:bg-slate-800"}`}
                      >
                        Saved card
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPaymentChoice("new")}
                      className={`flex-1 rounded-full py-1.5 text-xs font-medium transition ${paymentChoice === "new" ? "bg-sky-500 text-white" : "border border-slate-700 text-slate-300 hover:bg-slate-800"}`}
                    >
                      New card
                    </button>
                  </div>

                  {paymentChoice === "saved" &&
                    savedMethods.map((m) => (
                      <label
                        key={m.stripePaymentMethodId}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${selectedMethodId === m.stripePaymentMethodId ? "border-sky-500 bg-sky-950/30" : "border-slate-700 bg-slate-900 hover:border-slate-600"}`}
                      >
                        <input
                          type="radio"
                          name="savedMethod"
                          value={m.stripePaymentMethodId}
                          checked={selectedMethodId === m.stripePaymentMethodId}
                          onChange={() =>
                            setSelectedMethodId(m.stripePaymentMethodId)
                          }
                          className="h-4 w-4 accent-sky-500"
                        />
                        <span className="text-xs text-slate-200 capitalize">
                          {m.brand} •••• {m.last4}
                        </span>
                        <span className="ml-auto text-[11px] text-slate-500">
                          {m.expMonth}/{m.expYear}
                        </span>
                        {m.default && (
                          <span className="rounded-full bg-sky-950/60 px-2 py-0.5 text-[10px] text-sky-400 border border-sky-800/40">
                            Default
                          </span>
                        )}
                      </label>
                    ))}

                  {paymentChoice === "new" && (
                    <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
                      <CardElement
                        options={getStripeCardElementOptions("dark")}
                      />
                    </div>
                  )}

                  {cardError && (
                    <p className="text-xs text-rose-400">{cardError}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Review & confirm ─── */}
          {step === 3 && (
            <div className="flex flex-col gap-4 p-5">
              <h3 className="text-xs font-semibold text-slate-200">
                Order summary
              </h3>
              <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800 text-xs">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-400">Item</span>
                  <span className="font-medium text-slate-100 text-right max-w-[60%]">
                    {item.title}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-400">Quantity</span>
                  <span className="font-medium text-slate-100">{qty}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-400">Unit price</span>
                  <span className="font-medium text-slate-100">
                    {formatCents(item.priceCents, item.currency)}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-400 font-semibold">Total</span>
                  <span className="font-bold text-sky-400 text-sm">
                    {formatCents(total, item.currency)}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-400">Payment</span>
                  <span className="font-medium text-slate-100">
                    {item.priceCents === 0 ? (
                      <span className="text-emerald-400">Free</span>
                    ) : paymentChoice === "saved" ? (
                      (() => {
                        const m = savedMethods.find(
                          (x) => x.stripePaymentMethodId === selectedMethodId,
                        );
                        return m ? `${m.brand} •••• ${m.last4}` : "Saved card";
                      })()
                    ) : (
                      "New card"
                    )}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                Your order will be placed immediately after confirmation.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-2 border-t border-slate-800 px-5 py-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 rounded-full border border-slate-700 py-2 text-xs text-slate-300 hover:bg-slate-800"
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-slate-700 py-2 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={async () => {
                  setCardError("");
                  if (step === 2 && item.priceCents > 0) {
                    if (paymentChoice === "saved") {
                      if (!selectedMethodId) {
                        setCardError("Please select a payment method.");
                        return;
                      }
                    } else {
                      // Tokenize now, while CardElement is still mounted
                      if (!stripe || !elements) return;
                      const cardEl = elements.getElement(CardElement);
                      const { paymentMethod, error } =
                        await stripe.createPaymentMethod({
                          type: "card",
                          card: cardEl,
                        });
                      if (error) {
                        setCardError(error.message);
                        return;
                      }
                      setPendingPaymentMethodId(paymentMethod.id);
                    }
                  }
                  setStep((s) => s + 1);
                }}
                className="flex-1 rounded-full bg-sky-500 py-2 text-xs font-semibold text-on-accent hover:bg-sky-400"
              >
                {step === 2 ? "Review order →" : "Next →"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-full bg-sky-500 py-2 text-xs font-semibold text-on-accent hover:bg-sky-400"
              >
                Place Order · {formatCents(total, item.currency)}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * CheckoutModal — wraps the inner component in <Elements>.
 *
 * Props:
 *   item          — ShopItem
 *   onConfirm     — async fn({ quantity, paymentMethodId })
 *   onClose       — fn()
 *   stripePromise — from loadStripe(publishableKey)
 *   savedMethods  — array from myPaymentMethods
 */
export default function CheckoutModal({
  item,
  onConfirm,
  onClose,
  stripePromise,
  savedMethods = [],
}) {
  return (
    <Elements stripe={stripePromise || null}>
      <CheckoutModalInner
        item={item}
        onConfirm={onConfirm}
        onClose={onClose}
        savedMethods={savedMethods}
      />
    </Elements>
  );
}
