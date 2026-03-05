/**
 * Profile – loading-state tests.
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

// ── stable mocks ──────────────────────────────────────────────────────────────

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

vi.mock("../../apollo/client", () => ({ default: {} }));

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: (() => {
    const auth = {
      user: {
        id: "c1",
        email: "client@test.com",
        name: "Test Client",
        role: 2,
        roleName: "client",
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

vi.mock("../../theme/ThemeProvider", () => ({
  useTheme: (() => {
    const t = { theme: "dark", toggleTheme: vi.fn() };
    return () => t;
  })(),
  ThemeProvider: ({ children }) => children,
}));

vi.mock("../../location/LocationProvider", () => ({
  useLocationContext: (() => {
    const c = { locations: [], locationId: null, setLocationId: vi.fn() };
    return () => c;
  })(),
  LocationProvider: ({ children }) => children,
}));

vi.mock("../../components/ToastProvider", () => ({
  useToast: (() => {
    const t = { addToast: vi.fn() };
    return () => t;
  })(),
  ToastProvider: ({ children }) => children,
}));

vi.mock("../../studio/StudioProvider", () => ({
  useStudio: (() => {
    const s = {
      studios: [],
      selectedStudioId: "s1",
      setSelectedStudioId: vi.fn(),
    };
    return () => s;
  })(),
  StudioProvider: ({ children }) => children,
}));

vi.mock("../../currency/CurrencyProvider", () => ({
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
  App = (await import("../../App.jsx")).default;
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe("Profile – loading & content", () => {
  beforeEach(() => {
    window.history.pushState({}, "Test", "/profile");
  });
  afterEach(cleanup);

  it("renders without crashing", async () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("always shows the edit-profile form fields", async () => {
    render(<App />);
    // findBy* waits for Suspense to resolve the lazy Profile chunk
    await screen.findByPlaceholderText(/you@example\.com/i);
    expect(
      screen.getByRole("button", { name: /save profile/i }),
    ).toBeInTheDocument();
  });

  it("shows Memberships section heading for a client", async () => {
    render(<App />);
    // Wait for content then check the h2 section heading specifically
    await screen.findByRole("heading", { name: /memberships/i });
    expect(
      screen.getByRole("heading", { name: /memberships/i }),
    ).toBeInTheDocument();
  });

  it("shows Billing section heading", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: /billing/i });
    expect(
      screen.getByRole("heading", { name: /billing/i }),
    ).toBeInTheDocument();
  });
});
