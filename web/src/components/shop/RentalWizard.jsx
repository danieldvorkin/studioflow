import { useState, useEffect } from "react";
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

const DEFAULT_RENTAL_AGREEMENT = `RENTAL AGREEMENT

By proceeding with this rental, you confirm that you have read and agree to the following terms:

1. RETURN CONDITION — You agree to return the item in the same condition it was provided, free from damage, alterations, or excessive wear.

2. RETURN DATE — You agree to return the item by the agreed rental due date shown at checkout. Late returns may incur additional fees at the studio's discretion.

3. RESPONSIBILITY — You accept full responsibility for the item during the rental period, including in the event of loss, theft, or damage.

4. EXTENSION — If you require an extension, you must contact the studio prior to the original return date to arrange revised terms.

5. BINDING AGREEMENT — By accepting these terms, you acknowledge this agreement is binding and confirms your understanding of the rental conditions.`;

const today = () => new Date().toISOString().slice(0, 10);

const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Multi-step rental wizard.
 *
 * Steps:
 *   1 — Rental details (qty + due date)
 *   2 — Rental agreement (must read + accept)
 *   3 — Payment method (saved card or new card)
 *   4 — Confirm summary → submit
 *
 * Props:
 *   item          — ShopItem object (must be itemType === "rental")
 *   onConfirm     — async fn({ quantity, rentalDueDate, rentalAgreementAcceptedAt, paymentMethodId }) → void
 *   onClose       — fn()
 *   stripePromise — Promise<Stripe> | null
 *   savedMethods  — array of saved payment methods
 */
function RentalWizardInner({ item, onConfirm, onClose, savedMethods }) {
  const stripe = useStripe();
  const elements = useElements();
  const [step, setStep] = useState(1);
  const [qty, setQty] = useState(1);
  const [dueDate, setDueDate] = useState(addDays(today(), 7));
  const [agreed, setAgreed] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState(
    savedMethods.length > 0 ? "saved" : "new",
  );
  const [selectedMethodId, setSelectedMethodId] = useState(
    savedMethods.find((m) => m.default)?.stripePaymentMethodId ||
      savedMethods[0]?.stripePaymentMethodId ||
      "",
  );

  // Sync when savedMethods loads asynchronously after initial render
  useEffect(() => {
    if (savedMethods.length > 0) {
      setPaymentChoice((prev) => (prev === "new" ? "saved" : prev));
      setSelectedMethodId(
        (prev) =>
          prev ||
          savedMethods.find((m) => m.default)?.stripePaymentMethodId ||
          savedMethods[0]?.stripePaymentMethodId ||
          "",
      );
    }
  }, [savedMethods.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [cardError, setCardError] = useState("");
  const [overlayStatus, setOverlayStatus] = useState(null);
  const [overlayMsg, setOverlayMsg] = useState("");
  const [pendingPaymentMethodId, setPendingPaymentMethodId] = useState(null);

  const agreementText = item.rentalAgreementText || DEFAULT_RENTAL_AGREEMENT;
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
    setOverlayMsg("Confirming your rental…");
    try {
      await onConfirm({
        quantity: qty,
        rentalDueDate: dueDate,
        rentalAgreementAcceptedAt: new Date().toISOString(),
        paymentMethodId,
      });
      setOverlayStatus("success");
      setOverlayMsg("Rental confirmed!");
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

      {/* Backdrop */}
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
              <h2 className="text-sm font-semibold text-slate-100">
                Rent · {item.title}
              </h2>
            </div>

            {/* Step indicator — 4 steps */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-4 rounded-full transition-colors ${
                    s <= step ? "bg-amber-500" : "bg-slate-700"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <span className="sr-only">Close</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>

          {/* ── Step 1: Rental details ─────────────────────────────── */}
          {step === 1 && (
            <div className="flex flex-col gap-5 p-5">
              {/* Item summary */}
              <div className="flex items-start gap-3">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-amber-950/40 text-2xl">
                    📦
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-50">{item.title}</p>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-semibold text-amber-400">
                    {formatCents(item.priceCents, item.currency)} rental fee
                  </p>
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                <span className="text-xs text-slate-300">Quantity</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-slate-300 hover:bg-slate-700"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-slate-100">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-slate-300 hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Due date */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-400">
                  Return by (due date)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  min={addDays(today(), 1)}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {item.stockQuantity !== null && (
                <p className="text-[11px] text-center text-slate-500">
                  {item.stockQuantity} unit{item.stockQuantity !== 1 ? "s" : ""}{" "}
                  available to rent
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: Rental agreement ───────────────────────────── */}
          {step === 2 && (
            <div className="flex flex-col gap-4 p-5">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 mb-1">
                  Rental Agreement
                </h3>
                <p className="text-[11px] text-slate-500">
                  Please read and accept the terms before proceeding.
                </p>
              </div>

              <div className="h-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-4">
                <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-slate-300">
                  {agreementText}
                </pre>
              </div>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs text-slate-300">
                  I have read, understand, and agree to the rental terms above
                </span>
              </label>
            </div>
          )}

          {/* ── Step 3: Payment method ─────────────────────────────── */}
          {step === 3 && (
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
                        className={`flex-1 rounded-full py-1.5 text-xs font-medium transition ${paymentChoice === "saved" ? "bg-amber-500 text-slate-900" : "border border-slate-700 text-slate-300 hover:bg-slate-800"}`}
                      >
                        Saved card
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPaymentChoice("new")}
                      className={`flex-1 rounded-full py-1.5 text-xs font-medium transition ${paymentChoice === "new" ? "bg-amber-500 text-slate-900" : "border border-slate-700 text-slate-300 hover:bg-slate-800"}`}
                    >
                      New card
                    </button>
                  </div>

                  {paymentChoice === "saved" &&
                    savedMethods.map((m) => (
                      <label
                        key={m.stripePaymentMethodId}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${selectedMethodId === m.stripePaymentMethodId ? "border-amber-500 bg-amber-950/30" : "border-slate-700 bg-slate-900 hover:border-slate-600"}`}
                      >
                        <input
                          type="radio"
                          name="rentalMethod"
                          value={m.stripePaymentMethodId}
                          checked={selectedMethodId === m.stripePaymentMethodId}
                          onChange={() =>
                            setSelectedMethodId(m.stripePaymentMethodId)
                          }
                          className="h-4 w-4 accent-amber-500"
                        />
                        <span className="text-xs text-slate-200 capitalize">
                          {m.brand} •••• {m.last4}
                        </span>
                        <span className="ml-auto text-[11px] text-slate-500">
                          {m.expMonth}/{m.expYear}
                        </span>
                        {m.default && (
                          <span className="rounded-full bg-amber-950/60 px-2 py-0.5 text-[10px] text-amber-400 border border-amber-800/40">
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

          {/* ── Step 4: Confirmation summary ───────────────────────── */}
          {step === 4 && (
            <div className="flex flex-col gap-4 p-5">
              <h3 className="text-xs font-semibold text-slate-200">
                Confirm your rental
              </h3>

              <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800 text-xs">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-400">Item</span>
                  <span className="font-medium text-slate-100">
                    {item.title}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-400">Quantity</span>
                  <span className="font-medium text-slate-100">{qty}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-400">Return by</span>
                  <span className="font-medium text-slate-100">
                    {new Date(dueDate + "T00:00:00").toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-400">Rental fee</span>
                  <span className="font-semibold text-amber-400">
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
                <div className="flex justify-between px-4 py-3">
                  <span className="text-slate-400">Agreement</span>
                  <span className="text-emerald-400 font-medium">
                    ✓ Accepted
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                By confirming you agree to return the item by the due date.
              </p>
            </div>
          )}

          {/* Navigation buttons */}
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

            {step < 4 ? (
              <button
                type="button"
                onClick={async () => {
                  setCardError("");
                  if (step === 3 && item.priceCents > 0) {
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
                disabled={step === 2 && !agreed}
                className="flex-1 rounded-full bg-amber-500 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step === 2 ? "I Agree → Continue" : "Next →"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-full bg-amber-500 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-400"
              >
                {`Confirm Rental · ${formatCents(total, item.currency)}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * RentalWizard — wraps the inner component in <Elements>.
 */
export default function RentalWizard({
  item,
  onConfirm,
  onClose,
  stripePromise,
  savedMethods = [],
}) {
  return (
    <Elements stripe={stripePromise || null}>
      <RentalWizardInner
        item={item}
        onConfirm={onConfirm}
        onClose={onClose}
        savedMethods={savedMethods}
      />
    </Elements>
  );
}
