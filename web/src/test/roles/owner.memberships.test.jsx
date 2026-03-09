import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter } from "react-router-dom";

// ─── Module mocks ─────────────────────────────────────────────────────────────
vi.mock("../../components/shared/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
  ToastProvider: ({ children }) => children,
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
vi.mock("../../theme/ThemeProvider", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: vi.fn(),
    applyTheme: vi.fn(),
    clearThemeOverride: vi.fn(),
  }),
  ThemeProvider: ({ children }) => children,
}));

// ─── Page import ──────────────────────────────────────────────────────────────
import OwnerMembershipsPage from "../../pages/owner/memberships/OwnerMemberships.jsx";
import {
  MEMBERSHIP_PLANS,
  CLIENT_MEMBERSHIPS,
  CLIENTS,
  CURRENT_USER,
} from "../../apollo/queries.js";

// ─── Shared mock data ─────────────────────────────────────────────────────────
const OWNER = {
  __typename: "User",
  id: "u-owner",
  email: "owner@studio.com",
  name: "Studio Owner",
  role: 0,
  roleName: "owner",
  godmode: false,
  active: true,
  studioId: "studio-1",
};

function makePlan(overrides = {}) {
  return {
    __typename: "MembershipPlan",
    id: "plan-1",
    studioId: "studio-1",
    name: "Signature Membership",
    description: "Unlimited reformer classes every month.",
    priceCents: 17_900,
    currency: "cad",
    reformerClassesPerMonth: null,
    matClassesPerMonth: null,
    includesPriorityBooking: true,
    includesEarlyBooking: false,
    privateSessionDiscountPercent: 10,
    guestPassesPerMonth: 1,
    includesRetailDiscount: false,
    minCommitmentMonths: 3,
    autoRenew: true,
    active: true,
    position: 0,
    enrolledCount: 3,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeEnrollment(overrides = {}) {
  return {
    __typename: "ClientMembership",
    id: "cm-1",
    studioId: "studio-1",
    status: "active",
    startedAt: "2026-01-15",
    endsAt: null,
    cancelledAt: null,
    notes: null,
    createdAt: "2026-01-15T00:00:00Z",
    client: {
      __typename: "Client",
      id: "c-1",
      name: "Jane Doe",
      email: "jane@example.com",
    },
    membershipPlan: {
      __typename: "MembershipPlan",
      id: "plan-1",
      name: "Signature Membership",
      priceCents: 17_900,
      currency: "cad",
      reformerClassesPerMonth: null,
      matClassesPerMonth: null,
      includesPriorityBooking: true,
      includesEarlyBooking: false,
      privateSessionDiscountPercent: 10,
      guestPassesPerMonth: 1,
      includesRetailDiscount: false,
      minCommitmentMonths: 3,
      autoRenew: true,
    },
    ...overrides,
  };
}

// ─── Apollo mocks ─────────────────────────────────────────────────────────────
const currentUserMock = {
  request: { query: CURRENT_USER, variables: {} },
  result: { data: { currentUser: OWNER } },
};

const emptyPlansMock = {
  request: { query: MEMBERSHIP_PLANS, variables: {} },
  result: { data: { membershipPlans: [] } },
};

const onePlanMock = {
  request: { query: MEMBERSHIP_PLANS, variables: {} },
  result: { data: { membershipPlans: [makePlan()] } },
};

const emptyEnrollmentsMock = {
  request: { query: CLIENT_MEMBERSHIPS, variables: {} },
  result: { data: { clientMemberships: [] } },
};

const oneEnrollmentMock = {
  request: { query: CLIENT_MEMBERSHIPS, variables: {} },
  result: { data: { clientMemberships: [makeEnrollment()] } },
};

const emptyClientsMock = {
  request: { query: CLIENTS, variables: {} },
  result: {
    data: {
      clients: [],
    },
  },
};

// ─── Render helper ────────────────────────────────────────────────────────────
function renderPage(mocks = []) {
  return render(
    <MockedProvider mocks={mocks} addTypename cache={new InMemoryCache()}>
      <MemoryRouter initialEntries={["/owner/memberships"]}>
        <OwnerMembershipsPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(cleanup);

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("OwnerMembershipsPage – smoke", () => {
  describe("page structure", () => {
    it("renders the Memberships heading", async () => {
      renderPage([
        currentUserMock,
        emptyPlansMock,
        emptyEnrollmentsMock,
        emptyClientsMock,
      ]);
      await screen.findByText("Memberships");
      expect(screen.getByText("Memberships")).toBeTruthy();
    });

    it("renders the Plans tab and Members tab", async () => {
      renderPage([
        currentUserMock,
        emptyPlansMock,
        emptyEnrollmentsMock,
        emptyClientsMock,
      ]);
      await screen.findByText("Memberships");
      expect(screen.getByRole("button", { name: /^Plans$/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Members/i })).toBeTruthy();
    });

    it('shows the "New plan" button on the Plans tab', async () => {
      renderPage([
        currentUserMock,
        emptyPlansMock,
        emptyEnrollmentsMock,
        emptyClientsMock,
      ]);
      await screen.findByText("Memberships");
      expect(screen.getByRole("button", { name: /new plan/i })).toBeTruthy();
    });
  });

  describe("Plans tab – empty state", () => {
    it("shows empty state text when no plans exist", async () => {
      renderPage([
        currentUserMock,
        emptyPlansMock,
        emptyEnrollmentsMock,
        emptyClientsMock,
      ]);
      await screen.findByText(/no membership plans/i);
    });
  });

  describe("Plans tab – with data", () => {
    it("renders a plan card with its name and price", async () => {
      renderPage([
        currentUserMock,
        onePlanMock,
        emptyEnrollmentsMock,
        emptyClientsMock,
      ]);
      await screen.findByText("Signature Membership");
      expect(screen.getByText("Signature Membership")).toBeTruthy();
      // price displayed as $179.00
      expect(screen.getByText(/179/)).toBeTruthy();
    });

    it("shows enrolled count badge on the plan card", async () => {
      renderPage([
        currentUserMock,
        onePlanMock,
        emptyEnrollmentsMock,
        emptyClientsMock,
      ]);
      await screen.findByText("Signature Membership");
      // enrolled count = 3 — multiple elements contain "3" so use getAllByText
      expect(screen.getAllByText(/3/).length).toBeGreaterThan(0);
    });

    it("shows plan perks like Priority Booking", async () => {
      renderPage([
        currentUserMock,
        onePlanMock,
        emptyEnrollmentsMock,
        emptyClientsMock,
      ]);
      await screen.findByText("Signature Membership");
      expect(screen.getByText(/priority booking/i)).toBeTruthy();
    });
  });

  describe("Members tab", () => {
    it("switches to the Members tab and shows enrollment count in the label", async () => {
      const { getByRole } = renderPage([
        currentUserMock,
        emptyPlansMock,
        oneEnrollmentMock,
        emptyClientsMock,
      ]);
      await screen.findByText("Memberships");
      // Members tab label includes the count: "Members (1)"
      const membersTab = getByRole("button", { name: /Members/i });
      expect(membersTab).toBeTruthy();
    });

    it("shows enrolled client name after switching to Members tab", async () => {
      const { getByRole } = renderPage([
        currentUserMock,
        emptyPlansMock,
        oneEnrollmentMock,
        emptyClientsMock,
      ]);
      await screen.findByText("Memberships");
      getByRole("button", { name: /Members/i }).click();
      await screen.findByText("Jane Doe");
    });

    it("shows an Enroll client button on the Members tab", async () => {
      const { getByRole } = renderPage([
        currentUserMock,
        emptyPlansMock,
        emptyEnrollmentsMock,
        emptyClientsMock,
      ]);
      await screen.findByText("Memberships");
      getByRole("button", { name: /Members/i }).click();
      await screen.findByRole("button", { name: /enroll client/i });
    });
  });
});
