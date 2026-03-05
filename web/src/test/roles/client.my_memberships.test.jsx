import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter } from "react-router-dom";

// ─── Module mocks ─────────────────────────────────────────────────────────────
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }) => children,
  CardElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: () => null }));

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

vi.mock("../../components/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
  ToastProvider: ({ children }) => children,
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
    user: {
      id: "u-client",
      email: "member@example.com",
      name: "Member User",
      role: 3,
      roleName: "client",
      godmode: false,
      active: true,
      studioId: "studio-1",
    },
    loading: false,
    signOut: vi.fn(),
    isImpersonating: false,
  }),
  AuthProvider: ({ children }) => children,
}));

vi.mock("../../studio/StudioProvider", () => ({
  useStudio: () => ({
    selectedStudioId: "studio-1",
    setSelectedStudioId: vi.fn(),
    studios: [{ id: "studio-1", name: "Demo Studio" }],
    loading: false,
  }),
  StudioProvider: ({ children }) => children,
}));

// ─── Page import ──────────────────────────────────────────────────────────────
import MyMembershipsPage from "../../pages/MyMemberships.jsx";
import {
  MEMBERSHIP_PLANS,
  CLIENT_MEMBERSHIPS,
  MY_CLIENT,
  MY_PAYMENT_METHODS,
  PAYMENT_PUBLIC_SETTINGS,
} from "../../apollo/queries.js";

// ─── Shared mock data ─────────────────────────────────────────────────────────
const STUDIO_ID = "studio-1";

function makePlan(overrides = {}) {
  return {
    __typename: "MembershipPlan",
    id: "plan-1",
    studioId: STUDIO_ID,
    name: "Essential Membership",
    description: "Great for 4 classes / month",
    priceCents: 13_900,
    currency: "cad",
    reformerClassesPerMonth: 4,
    matClassesPerMonth: null,
    includesPriorityBooking: false,
    includesEarlyBooking: false,
    privateSessionDiscountPercent: 0,
    guestPassesPerMonth: 0,
    includesRetailDiscount: false,
    minCommitmentMonths: 3,
    autoRenew: true,
    active: true,
    position: 0,
    enrolledCount: 2,
    createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    ...overrides,
  };
}

function makeMembership(overrides = {}) {
  const plan = makePlan();
  return {
    __typename: "ClientMembership",
    id: "cm-1",
    studioId: STUDIO_ID,
    status: "active",
    startedAt: "2026-01-15",
    endsAt: null,
    cancelledAt: null,
    notes: null,
    createdAt: new Date("2026-01-15T00:00:00Z").toISOString(),
    client: {
      __typename: "Client",
      id: "c-1",
      name: "Member User",
      email: "member@example.com",
    },
    membershipPlan: {
      __typename: "MembershipPlan",
      id: plan.id,
      name: plan.name,
      priceCents: plan.priceCents,
      currency: plan.currency,
      reformerClassesPerMonth: plan.reformerClassesPerMonth,
      matClassesPerMonth: plan.matClassesPerMonth,
      includesPriorityBooking: plan.includesPriorityBooking,
      includesEarlyBooking: plan.includesEarlyBooking,
      privateSessionDiscountPercent: plan.privateSessionDiscountPercent,
      guestPassesPerMonth: plan.guestPassesPerMonth,
      includesRetailDiscount: plan.includesRetailDiscount,
      minCommitmentMonths: plan.minCommitmentMonths,
      autoRenew: plan.autoRenew,
    },
    ...overrides,
  };
}

const paymentUnconfiguredMock = {
  request: {
    query: PAYMENT_PUBLIC_SETTINGS,
    variables: { studioId: STUDIO_ID },
  },
  result: {
    data: {
      paymentPublicSettings: {
        __typename: "PaymentPublicSetting",
        stripePublishableKey: null,
        defaultCurrency: "cad",
        enabled: false,
        configured: false,
      },
    },
  },
};

const myClientMock = {
  request: { query: MY_CLIENT, variables: { studioId: STUDIO_ID } },
  result: {
    data: {
      myClient: {
        __typename: "Client",
        id: "c-1",
        name: "Member User",
        email: "member@example.com",
        stripeCustomerId: null,
        stripeDefaultPaymentMethodId: null,
        stripeDefaultPaymentMethodBrand: null,
        stripeDefaultPaymentMethodLast4: null,
        stripeDefaultPaymentMethodExpMonth: null,
        stripeDefaultPaymentMethodExpYear: null,
        clientPaymentMethods: [],
      },
    },
  },
};

const myPaymentMethodsMock = {
  request: { query: MY_PAYMENT_METHODS, variables: {} },
  result: { data: { myPaymentMethods: [] } },
};

const emptyMembershipsMock = {
  request: { query: CLIENT_MEMBERSHIPS, variables: {} },
  result: { data: { clientMemberships: [] } },
};

const activeMembershipsMock = {
  request: { query: CLIENT_MEMBERSHIPS, variables: {} },
  result: { data: { clientMemberships: [makeMembership()] } },
};

const noPlansAvailableMock = {
  request: { query: MEMBERSHIP_PLANS, variables: { studioId: STUDIO_ID } },
  result: { data: { membershipPlans: [] } },
};

const plansAvailableMock = {
  request: { query: MEMBERSHIP_PLANS, variables: { studioId: STUDIO_ID } },
  result: { data: { membershipPlans: [makePlan()] } },
};

function renderMemberships(mocks) {
  return render(
    <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
      <MemoryRouter initialEntries={["/my-memberships"]}>
        <MyMembershipsPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("Client – My Memberships page", () => {
  it("renders the My Memberships heading", async () => {
    renderMemberships([
      paymentUnconfiguredMock,
      myClientMock,
      myPaymentMethodsMock,
      emptyMembershipsMock,
      noPlansAvailableMock,
    ]);
    // The page-level heading (h1)
    expect(
      await screen.findByRole("heading", { level: 1, name: /Memberships/i }),
    ).toBeInTheDocument();
  });

  it("shows available membership plans", async () => {
    renderMemberships([
      paymentUnconfiguredMock,
      myClientMock,
      myPaymentMethodsMock,
      emptyMembershipsMock,
      plansAvailableMock,
    ]);
    expect(
      await screen.findByText(/Essential Membership/i),
    ).toBeInTheDocument();
  });

  it('shows "No membership plans are currently available" when no plans exist', async () => {
    renderMemberships([
      paymentUnconfiguredMock,
      myClientMock,
      myPaymentMethodsMock,
      emptyMembershipsMock,
      noPlansAvailableMock,
    ]);
    expect(
      await screen.findByText(/No membership plans are currently available/i),
    ).toBeInTheDocument();
  });

  it("shows a Subscribe button for each available plan", async () => {
    renderMemberships([
      paymentUnconfiguredMock,
      myClientMock,
      myPaymentMethodsMock,
      emptyMembershipsMock,
      plansAvailableMock,
    ]);
    await screen.findByText(/Essential Membership/i);
    expect(
      screen.getByRole("button", { name: /Subscribe/i }),
    ).toBeInTheDocument();
  });

  it("shows the active membership section when client has an active plan", async () => {
    renderMemberships([
      paymentUnconfiguredMock,
      myClientMock,
      myPaymentMethodsMock,
      activeMembershipsMock,
      noPlansAvailableMock,
    ]);
    expect(await screen.findByText(/My Memberships/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/Essential Membership/i),
    ).toBeInTheDocument();
    // Status badge
    expect(await screen.findByText(/active/i)).toBeInTheDocument();
  });

  it("shows the Available Plans section heading", async () => {
    renderMemberships([
      paymentUnconfiguredMock,
      myClientMock,
      myPaymentMethodsMock,
      emptyMembershipsMock,
      plansAvailableMock,
    ]);
    expect(await screen.findByText(/Available Plans/i)).toBeInTheDocument();
  });
});
