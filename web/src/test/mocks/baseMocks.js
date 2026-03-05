import React from "react";
import { vi } from "vitest";

const authState = {
  user: null,
  loading: false,
  isImpersonating: false,
  impersonator: null,
};

const locationState = {
  locations: [],
  locationId: null,
  setLocationId: vi.fn(),
};

const toastState = {
  addToast: vi.fn(),
};

export function setMockAuth({
  user = null,
  loading = false,
  isImpersonating = false,
  impersonator = null,
} = {}) {
  authState.user = user;
  authState.loading = loading;
  authState.isImpersonating = isImpersonating;
  authState.impersonator = impersonator;
}

export function setMockLocationContext(next = {}) {
  Object.assign(locationState, next);
}

export function getMockAddToast() {
  return toastState.addToast;
}

vi.mock("../../components/ToastProvider", () => ({
  useToast: () => ({ addToast: toastState.addToast }),
  ToastProvider: ({ children }) => children,
}));

vi.mock("../../location/LocationProvider", () => ({
  useLocationContext: () => locationState,
  LocationProvider: ({ children }) => children,
}));

vi.mock("../../theme/ThemeProvider", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: vi.fn(),
    applyTheme: vi.fn(),
    clearThemeOverride: vi.fn(),
  }),
  ThemeProvider: ({ children }) => children,
}));

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: authState.user,
    loading: authState.loading,
    signOut: vi.fn(),
    signInWithToken: vi.fn(),
    refetch: vi.fn(),
    beginImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
    isImpersonating: authState.isImpersonating,
    impersonator: authState.impersonator,
  }),
  AuthProvider: ({ children }) => children,
}));

vi.mock("../../currency/CurrencyProvider", () => ({
  useCurrency: () => ({
    currency: "cad",
    setCurrency: vi.fn(),
    isCAD: true,
    priceDisplay: (cadAmount, _usdAmount) => ({
      symbol: "$",
      amount: cadAmount,
      label: "CAD",
    }),
    formatPrice: (cents, _storedCurrency) => {
      if (typeof cents !== "number" || !Number.isFinite(cents)) return "—";
      return `CA$${(cents / 100).toFixed(2)}`;
    },
  }),
  CurrencyProvider: ({ children }) => children,
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }) => children,
  CardElement: () =>
    React.createElement("div", { "data-testid": "card-element" }),
  useStripe: () => ({
    createPaymentMethod: vi.fn().mockResolvedValue({
      paymentMethod: { id: "pm_test_new" },
      error: null,
    }),
  }),
  useElements: () => ({
    getElement: () => ({}),
  }),
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => ({}),
}));

vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }) => children,
  useGoogleLogin: (opts) => () =>
    opts?.onSuccess?.({ access_token: "test-access-token" }),
}));
