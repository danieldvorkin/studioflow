import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import "./mocks/baseMocks";
import { setMockAuth } from "./mocks/baseMocks";
import { ownerUser, clientUser } from "./helpers/users";
import OwnerSubscription from "../pages/owner/settings/OwnerSubscription";

// ---------------------------------------------------------------------------
// Apollo mock — stateful so each test can configure query/mutation behaviour
// ---------------------------------------------------------------------------
const queryState = {
  data: { myStudioSubscription: null },
  loading: false,
};

const mutationState = {
  fn: vi.fn(),
  loading: false,
};

vi.mock("@apollo/client", () => ({
  gql: (strings, ...values) => String.raw({ raw: strings }, ...values),
  useQuery: (() => {
    const impl = () => ({
      data: queryState.data,
      loading: queryState.loading,
      refetch: vi.fn(),
    });
    return impl;
  })(),
  useMutation: (() => {
    const impl = () => [mutationState.fn, { loading: mutationState.loading }];
    return impl;
  })(),
}));

vi.mock("../../apollo/client", () => ({ default: {} }));

// ---------------------------------------------------------------------------
// State reset + DOM cleanup between tests
// ---------------------------------------------------------------------------

afterEach(() => cleanup());
function basicActiveSub(overrides = {}) {
  return {
    id: "1",
    tier: "pro",
    status: "active",
    active: true,
    stripeSubscriptionId: "sub_test123",
    currentPeriodEnd: "2025-07-01T00:00:00Z",
    studio: { slug: "awesome-studio", __typename: "Studio" },
    __typename: "StudioSubscription",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  mutationState.fn = vi.fn();
  mutationState.loading = false;
  queryState.loading = false;
  queryState.data = { myStudioSubscription: null };
  setMockAuth({ user: ownerUser() });
});

function renderSub(initialPath = "/subscription") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <OwnerSubscription />
    </MemoryRouter>,
  );
}

describe("OwnerSubscription page", () => {
  it("renders the page heading", () => {
    renderSub();
    expect(screen.getByText("Subscription")).toBeInTheDocument();
    expect(
      screen.getByText(/StudioFlow plan and billing/i),
    ).toBeInTheDocument();
  });

  it("shows no-subscription placeholder when query returns null", () => {
    queryState.data = { myStudioSubscription: null };
    renderSub();
    expect(screen.getByText("No active subscription yet")).toBeInTheDocument();
  });

  it("renders loading text when query is in flight", () => {
    queryState.loading = true;
    queryState.data = {};
    renderSub();
    expect(screen.getByText(/Loading subscription/i)).toBeInTheDocument();
  });

  it("renders CurrentPlanBanner when subscription exists", () => {
    queryState.data = { myStudioSubscription: basicActiveSub() };
    renderSub();
    expect(screen.getByText("Your current plan")).toBeInTheDocument();
    // Banner heading is an h2; tier card uses h3 — disambiguate by role
    expect(
      screen.getByRole("heading", { level: 2, name: "Pro" }),
    ).toBeInTheDocument();
  });

  it("shows subdomain and billing date in banner", () => {
    queryState.data = { myStudioSubscription: basicActiveSub() };
    renderSub();
    expect(
      screen.getByText("awesome-studio.studioflow.app"),
    ).toBeInTheDocument();
    expect(screen.getByText(/sub_test123/)).toBeInTheDocument();
  });

  it("shows status badge in banner", () => {
    queryState.data = { myStudioSubscription: basicActiveSub() };
    renderSub();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it('shows "Current" badge on the active tier card', () => {
    queryState.data = { myStudioSubscription: basicActiveSub({ tier: "pro" }) };
    renderSub();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it('shows "Best value" badge on studio card when studio is not the active tier', () => {
    queryState.data = { myStudioSubscription: basicActiveSub({ tier: "pro" }) };
    renderSub();
    expect(screen.getByText("Best value")).toBeInTheDocument();
  });

  it('does NOT show "Best value" badge when studio is the current active plan', () => {
    queryState.data = {
      myStudioSubscription: basicActiveSub({ tier: "studio" }),
    };
    renderSub();
    expect(screen.queryByText("Best value")).not.toBeInTheDocument();
    const currentBadges = screen.getAllByText("Current");
    expect(currentBadges).toHaveLength(1);
  });

  it("renders subscribe buttons when there is no subscription", () => {
    queryState.data = { myStudioSubscription: null };
    renderSub();
    expect(
      screen.getByRole("button", { name: /Subscribe to Pro/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Subscribe to Studio/i }),
    ).toBeInTheDocument();
  });

  it("renders subscribe button only for non-current tier when a plan is active", () => {
    queryState.data = { myStudioSubscription: basicActiveSub({ tier: "pro" }) };
    renderSub();
    // Pro is current — no button, shows contact text instead
    expect(
      screen.queryByRole("button", { name: /Subscribe to Pro/i }),
    ).not.toBeInTheDocument();
    // Studio is not current — shows button
    expect(
      screen.getByRole("button", { name: /Subscribe to Studio/i }),
    ).toBeInTheDocument();
  });

  it("calls the checkout mutation with the chosen tier on button click", async () => {
    mutationState.fn.mockResolvedValue({
      data: {
        createPlatformSubscriptionCheckout: {
          checkoutUrl: "https://checkout.stripe.com/pay/test_sess",
          errors: [],
        },
      },
    });
    // Mock window.location.href assignment
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: "" };

    queryState.data = { myStudioSubscription: null };
    renderSub();

    fireEvent.click(screen.getByRole("button", { name: /Subscribe to Pro/i }));

    await waitFor(() => {
      expect(mutationState.fn).toHaveBeenCalledWith({
        variables: { tier: "pro", currency: "cad", billingInterval: "month" },
      });
    });

    await waitFor(() => {
      expect(window.location.href).toBe(
        "https://checkout.stripe.com/pay/test_sess",
      );
    });

    window.location = originalLocation;
  });

  it("shows error message when mutation returns errors", async () => {
    mutationState.fn.mockResolvedValue({
      data: {
        createPlatformSubscriptionCheckout: {
          checkoutUrl: null,
          errors: ["Already subscribed to this plan"],
        },
      },
    });

    queryState.data = { myStudioSubscription: null };
    renderSub();

    fireEvent.click(screen.getByRole("button", { name: /Subscribe to Pro/i }));

    await screen.findByText("Already subscribed to this plan");
  });

  it("shows error message when mutation throws", async () => {
    mutationState.fn.mockRejectedValue(new Error("Network error"));

    queryState.data = { myStudioSubscription: null };
    renderSub();

    fireEvent.click(screen.getByRole("button", { name: /Subscribe to Pro/i }));

    await screen.findByText("Network error");
  });

  it("renders success banner when checkout_success=1 is in URL", () => {
    queryState.data = { myStudioSubscription: null };
    renderSub("/subscription?checkout_success=1");
    expect(screen.getByText(/Payment successful/i)).toBeInTheDocument();
  });

  it("renders cancelled banner when checkout_cancelled=1 is in URL", () => {
    queryState.data = { myStudioSubscription: null };
    renderSub("/subscription?checkout_cancelled=1");
    expect(screen.getByText(/Checkout was cancelled/i)).toBeInTheDocument();
  });

  it("shows past_due alert text when subscription is past due", () => {
    queryState.data = {
      myStudioSubscription: basicActiveSub({
        status: "past_due",
        active: false,
      }),
    };
    renderSub();
    expect(
      screen.getByText(/subscription payment is past due/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/support@joinstudioflow.com/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows cancelled alert text when subscription is cancelled", () => {
    queryState.data = {
      myStudioSubscription: basicActiveSub({
        status: "cancelled",
        active: false,
      }),
    };
    renderSub();
    expect(
      screen.getByText(/subscription has been cancelled/i),
    ).toBeInTheDocument();
  });

  it("shows suspended alert text when subscription is suspended", () => {
    queryState.data = {
      myStudioSubscription: basicActiveSub({
        status: "suspended",
        active: false,
      }),
    };
    renderSub();
    expect(screen.getByText(/currently suspended/i)).toBeInTheDocument();
  });

  it("redirects to /dashboard when user is not an owner", () => {
    setMockAuth({ user: clientUser() });
    queryState.data = { myStudioSubscription: null };

    // Navigate renders nothing in MemoryRouter in our mock environment;
    // what matters is the page content is NOT shown
    renderSub();
    expect(screen.queryByText("Subscription")).not.toBeInTheDocument();
  });

  it("redirects to /dashboard when user is null", () => {
    setMockAuth({ user: null });
    queryState.data = { myStudioSubscription: null };
    renderSub();
    expect(
      screen.queryByText("No active subscription yet"),
    ).not.toBeInTheDocument();
  });

  it("shows both tier cards with prices", () => {
    queryState.data = { myStudioSubscription: null };
    renderSub();
    expect(screen.getAllByText(/\$79/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\$175/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CAD \/ month/).length).toBeGreaterThan(0);
  });

  it("renders Stripe billing disclaimer text", () => {
    queryState.data = { myStudioSubscription: null };
    renderSub();
    expect(
      screen.getByText(/Payments are processed securely by Stripe/i),
    ).toBeInTheDocument();
  });
});
