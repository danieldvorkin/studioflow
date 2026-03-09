/**
 * Schedule page smoke tests.
 *
 * The Schedule page uses date-based query variables (week/month ranges) that
 * change every run. We mock @apollo/client at the module level so that all
 * useQuery calls return empty data without needing to match exact variables.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Stable mock objects (identity must not change between renders) ─────────────
const EMPTY_RESULT = Object.freeze({
  data: {},
  loading: false,
  error: undefined,
});
const MUTATION_STUB = Object.freeze([vi.fn(), { loading: false }]);

vi.mock("@apollo/client", () => ({
  gql: (strings, ...values) => String.raw({ raw: strings }, ...values),
  useQuery: () => EMPTY_RESULT,
  useMutation: () => MUTATION_STUB,
  InMemoryCache: class {},
}));

vi.mock("../../apollo/client", () => ({ default: {} }));

// ── Provider mocks (from baseMocks pattern) ───────────────────────────────────
vi.mock("../../components/shared/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
  ToastProvider: ({ children }) => children,
}));

vi.mock("../../location/LocationProvider", () => ({
  useLocationContext: () => ({
    locations: [],
    locationId: null,
    setLocationId: vi.fn(),
  }),
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

// ── Auth mock — mutable so each describe block can change the user ─────────────
const authState = {
  user: null,
  loading: false,
  isImpersonating: false,
  impersonator: null,
};

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

vi.mock("../../studio/StudioProvider", () => ({
  useStudio: () => ({
    studios: [],
    selectedStudioId: null,
    setSelectedStudioId: vi.fn(),
    loading: false,
  }),
  StudioProvider: ({ children }) => children,
}));

// ── Page import (after all mocks) ─────────────────────────────────────────────
import Schedule from "../../pages/shared/Schedule.jsx";

function setUser(overrides = {}) {
  authState.user = {
    id: "u-1",
    email: "user@example.com",
    name: "Test User",
    role: 0,
    roleName: "owner",
    godmode: false,
    active: true,
    availableForSessions: true,
    ...overrides,
  };
}

function renderSchedule() {
  return render(
    <MemoryRouter initialEntries={["/schedule"]}>
      <Schedule />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("Schedule page — owner", () => {
  beforeEach(() => {
    setUser({ role: 0, roleName: "owner" });
  });

  it("renders without crashing", () => {
    const { container } = renderSchedule();
    expect(container).toBeTruthy();
  });

  it('shows "Weekly calendar" heading by default', async () => {
    renderSchedule();
    expect(
      await screen.findByRole("heading", { name: /Weekly calendar/i }),
    ).toBeInTheDocument();
  });

  it("shows Week and Month view toggle buttons", async () => {
    renderSchedule();
    await screen.findByRole("heading", { name: /Weekly calendar/i });
    expect(
      screen.getAllByRole("button", { name: /Week/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /Month/i }).length,
    ).toBeGreaterThan(0);
  });
});

describe("Schedule page — staff", () => {
  beforeEach(() => {
    setUser({ role: 1, roleName: "staff" });
  });

  it("renders without crashing for staff", () => {
    const { container } = renderSchedule();
    expect(container).toBeTruthy();
  });

  it("shows the calendar heading for staff", async () => {
    renderSchedule();
    expect(
      await screen.findByRole("heading", { name: /Weekly calendar/i }),
    ).toBeInTheDocument();
  });
});

describe("Schedule page — client", () => {
  beforeEach(() => {
    setUser({ role: 3, roleName: "client" });
  });

  it("renders without crashing for client", () => {
    const { container } = renderSchedule();
    expect(container).toBeTruthy();
  });

  it("shows the calendar heading for client", async () => {
    renderSchedule();
    expect(
      await screen.findByRole("heading", { name: /Weekly calendar/i }),
    ).toBeInTheDocument();
  });
});

describe("Schedule page — instructor", () => {
  beforeEach(() => {
    setUser({ role: 2, roleName: "instructor" });
  });

  it("renders without crashing for instructor", () => {
    const { container } = renderSchedule();
    expect(container).toBeTruthy();
  });

  it("shows the calendar heading for instructor", async () => {
    renderSchedule();
    expect(
      await screen.findByRole("heading", { name: /Weekly calendar/i }),
    ).toBeInTheDocument();
  });
});
