import { createContext, useContext, useState, useCallback } from "react";

const CurrencyContext = createContext(null);

const STORAGE_KEY = "sf_currency";

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

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, isCAD, priceDisplay }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
