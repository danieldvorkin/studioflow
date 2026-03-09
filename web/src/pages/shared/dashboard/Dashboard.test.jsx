/**
 * Dashboard – loading-state tests.
 *
 * Uses the same stable-mock pattern as appRoutes.smoke.test.jsx to avoid
 * re-render loops (ERR_IPC_CHANNEL_CLOSED / heap OOM).
 */
import React from "react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterEach,
} from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ── stable mocks (object identity must not change between renders) ────────────

const LOADING = Object.freeze({
  data: undefined,
  loading: true,
  error: undefined,
});
const EMPTY = Object.freeze({ data: {}, loading: false, error: undefined });

vi.mock("@apollo/client", () => ({
  gql: (strings, ...values) => String.raw({ raw: strings }, ...values),
  useQuery: (() => {
    return () => EMPTY;
  })(),
  useLazyQuery: (() => {
    const s = [vi.fn(), { loading: false, data: {}, error: undefined }];
    return () => s;
  })(),
  useMutation: (() => {
    const t = [vi.fn(), { loading: false }];
    return () => t;
  })(),
}));

vi.mock("../../../apollo/client", () => ({ default: {} }));

vi.mock("../../../auth/AuthProvider", () => ({
  useAuth: (() => {
    const auth = {
      user: {
        id: "u1",
        email: "owner@test.com",
        name: "Studio Owner",
        role: 0,
        roleName: "owner",
        godmode: false,
        active: true,
      },
      loading: false,
      signOut: vi.fn(),
      signInWithToken: vi.fn(),
      refetch: vi.fn(),
      isImpersonating: false,
      impersonator: null,
      beginImpersonation: vi.fn(),
      stopImpersonation: vi.fn(),
    };
    return () => auth;
  })(),
  AuthProvider: ({ children }) => children,
}));

vi.mock("../../../theme/ThemeProvider", () => ({
  useTheme: (() => {
    const t = { theme: "dark", toggleTheme: vi.fn() };
    return () => t;
  })(),
  ThemeProvider: ({ children }) => children,
}));

vi.mock("../../../location/LocationProvider", () => ({
  useLocationContext: (() => {
    const c = { locations: [], locationId: null, setLocationId: vi.fn() };
    return () => c;
  })(),
  LocationProvider: ({ children }) => children,
}));

vi.mock("../../../components/shared/ToastProvider", () => ({
  useToast: (() => {
    const t = { addToast: vi.fn() };
    return () => t;
  })(),
  ToastProvider: ({ children }) => children,
}));

vi.mock("../../../studio/StudioProvider", () => ({
  useStudio: (() => {
    const s = {
      studios: [],
      selectedStudioId: null,
      setSelectedStudioId: vi.fn(),
    };
    return () => s;
  })(),
  StudioProvider: ({ children }) => children,
}));

vi.mock("../../../currency/CurrencyProvider", () => ({
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

vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }) => children,
  useGoogleLogin: (opts) => () => opts?.onSuccess?.({ access_token: "tok" }),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }) => children,
  CardElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => null }));

// ── import App once ───────────────────────────────────────────────────────────

let App;
beforeAll(async () => {
  App = (await import("../../../App.jsx")).default;
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("Dashboard – loading & content", () => {
  beforeEach(() => {
    window.history.pushState({}, "Test", "/dashboard");
  });
  afterEach(cleanup);

  it("renders without crashing", async () => {
    render(<App />);
    // App shell sign-out button always present (not behind Suspense)
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("shows the section header after Suspense resolves", async () => {
    render(<App />);
    // findBy* retries until Suspense resolves the lazy chunk
    await screen.findByText(/location performance/i);
    expect(screen.getByText(/location performance/i)).toBeInTheDocument();
  });

  it("does NOT render stat card data while queries return empty", async () => {
    render(<App />);
    await screen.findByText(/location performance/i);
    // With empty mocked data, no revenue numbers appear
    expect(screen.queryByText("Revenue (30d)")).not.toBeInTheDocument();
    expect(screen.queryByText("Bookings (7d)")).not.toBeInTheDocument();
  });
});
