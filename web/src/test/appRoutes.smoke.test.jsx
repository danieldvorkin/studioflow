import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Keep these tests "super basic": we’re only verifying that each route mounts
// without crashing. We stub the Apollo hooks to avoid needing a full GraphQL
// mock matrix for every page.
vi.mock("@apollo/client", () => ({
  gql: (strings, ...values) => String.raw({ raw: strings }, ...values),
  // IMPORTANT: return stable object identities across renders.
  // Some app code depends on referential stability from Apollo hooks; returning
  // fresh objects here can trigger useEffect dependency churn and runaway
  // re-render loops (which shows up as Node heap OOM + "ERR_IPC_CHANNEL_CLOSED").
  useQuery: (() => {
    const result = { data: {}, loading: false, error: undefined };
    return () => result;
  })(),
  useLazyQuery: (() => {
    const execute = vi.fn();
    const state = { called: false, loading: false, data: {}, error: undefined };
    const tuple = [execute, state];
    return () => tuple;
  })(),
  useMutation: (() => {
    const mutate = vi.fn();
    const state = { loading: false, data: undefined, error: undefined };
    const tuple = [mutate, state];
    return () => tuple;
  })(),
}));

// Some pages import the preconfigured Apollo client (which, in turn, imports
// low-level Apollo link utilities). For this smoke test we only care that
// routes mount without crashing, so we can stub the client module entirely.
vi.mock("../apollo/client", () => ({
  default: {},
}));

vi.mock("../auth/AuthProvider", () => ({
  useAuth: (() => {
    const user = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      role: 0,
      roleName: "owner",
      active: true,
    };

    const auth = {
      user,
      loading: false,
      signOut: vi.fn(),
      signInWithToken: vi.fn(),
      refetch: vi.fn(),
      beginImpersonation: vi.fn(),
      stopImpersonation: vi.fn(),
      isImpersonating: false,
      impersonator: null,
    };

    return () => auth;
  })(),
  AuthProvider: ({ children }) => children,
}));

vi.mock("../theme/ThemeProvider", () => ({
  useTheme: (() => {
    const theme = { theme: "dark", toggleTheme: vi.fn() };
    return () => theme;
  })(),
  ThemeProvider: ({ children }) => children,
}));

vi.mock("../location/LocationProvider", () => ({
  useLocationContext: (() => {
    const ctx = {
      locations: [],
      locationId: null,
      setLocationId: vi.fn(),
    };
    return () => ctx;
  })(),
  LocationProvider: ({ children }) => children,
}));

vi.mock("../currency/CurrencyProvider", () => ({
  useCurrency: (() => {
    const ctx = {
      currency: "cad",
      setCurrency: vi.fn(),
      isCAD: true,
      priceDisplay: (cad) => ({ symbol: "$", amount: cad, label: "CAD" }),
    };
    return () => ctx;
  })(),
  CurrencyProvider: ({ children }) => children,
}));

vi.mock("../components/shared/ToastProvider", () => ({
  useToast: (() => {
    const toast = { addToast: vi.fn() };
    return () => toast;
  })(),
  ToastProvider: ({ children }) => children,
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }) => children,
  CardElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => null,
}));

vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }) => children,
  useGoogleLogin: (opts) => () =>
    opts?.onSuccess?.({ access_token: "test-access-token" }),
}));

import App from "../App.jsx";

const ROUTES = [
  "/",
  "/signin",
  "/signup",
  "/signup/owner",
  "/signup/client",
  "/dashboard",
  "/profile",
  "/owner",
  "/owner/instructor-payouts",
  "/locations",
  "/templates",
  "/templates/1/sessions",
  "/booking/1",
  "/schedule",
  "/bookings",
  "/my-bookings",
  "/bookings/1",
  "/clients",
];

describe("Route smoke renders", () => {
  beforeEach(() => {
    cleanup();
  });

  for (const path of ROUTES) {
    it(`renders ${path} without crashing`, () => {
      window.history.pushState({}, "Test", path);
      const { container } = render(<App />);

      if (path === "/") {
        expect(
          screen.getByRole("heading", { name: /studio management/i }),
        ).toBeInTheDocument();
      } else if (path === "/signin") {
        expect(
          screen.getByRole("heading", { name: /sign in/i }),
        ).toBeInTheDocument();
      } else {
        // Protected routes should show the app shell header.
        expect(
          screen.getByRole("button", { name: /sign out/i }),
        ).toBeInTheDocument();
      }

      expect(container).toBeTruthy();
    });
  }
});
