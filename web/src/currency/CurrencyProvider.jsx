import { createContext, useContext, useState, useCallback } from "react";

const CurrencyContext = createContext(null);

const STORAGE_KEY = "sf_currency";

// Fixed exchange rates (update periodically as needed)
const CAD_TO_USD = 0.74;
const USD_TO_CAD = 1 / CAD_TO_USD;

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "usd" ? "usd" : "cad"; // default to CAD
  });

  const setCurrency = useCallback((next) => {
    const value = next === "usd" ? "usd" : "cad";
    localStorage.setItem(STORAGE_KEY, value);
    setCurrencyState(value);
  }, []);

  const isCAD = currency === "cad";

  /**
   * Format a price for display.
   * @param {number} cadAmount - CAD price
   * @param {number} usdAmount - USD price
   * @returns {{ symbol: string, amount: number, label: string }}
   */
  const priceDisplay = useCallback(
    (cadAmount, usdAmount) => {
      if (currency === "usd") {
        return { symbol: "$", amount: usdAmount, label: "USD" };
      }
      return { symbol: "$", amount: cadAmount, label: "CAD" };
    },
    [currency],
  );

  /**
   * Convert and format a cents amount from its stored currency to the
   * currently selected display currency.
   *
   * @param {number|null|undefined} cents - Amount in cents (in storedCurrency)
   * @param {string} [storedCurrency="cad"] - The currency the amount is stored in
   * @returns {string} Formatted price string (e.g. "CA$59.00" or "US$43.66")
   */
  const formatPrice = useCallback(
    (cents, storedCurrency = "cad") => {
      const amount = Number(cents);
      if (!Number.isFinite(amount)) return "—";

      const stored = (storedCurrency || "cad").toLowerCase();
      let displayCents = amount;

      if (stored !== currency) {
        if (stored === "cad" && currency === "usd") {
          displayCents = Math.round(amount * CAD_TO_USD);
        } else if (stored === "usd" && currency === "cad") {
          displayCents = Math.round(amount * USD_TO_CAD);
        }
      }

      const cur = currency.toUpperCase();
      try {
        return new Intl.NumberFormat("en-CA", {
          style: "currency",
          currency: cur,
        }).format(displayCents / 100);
      } catch {
        return `$${(displayCents / 100).toFixed(2)} ${cur}`;
      }
    },
    [currency],
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, isCAD, priceDisplay, formatPrice }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
