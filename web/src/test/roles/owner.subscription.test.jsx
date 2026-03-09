import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import "../mocks/baseMocks";
import { setMockAuth } from "../mocks/baseMocks";
import { ownerUser } from "../helpers/users";

// ─── Shared apollo state ───────────────────────────────────────────────────────

const owner = ownerUser({ id: "u-owner", studioId: "studio-1" });

const makeSubscription = (overrides = {}) => ({
  __typename: "StudioSubscription",
  id: "sub-1",
  studioId: "studio-1",
  tier: "pro",
  status: "active",
  stripeCustomerId: "cus_test",
  stripeSubscriptionId: "sub_test_123",
  currentPeriodEnd: "2026-04-05T00:00:00Z",
  cancelledAt: null,
  priceCad: 80,
  active: true,
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
  notes: null,
  studio: {
    __typename: "Studio",
    id: "studio-1",
    name: "Test Studio",
    slug: "test-studio",
  },
  ...overrides,
});

const queryState = {
  sub: makeSubscription(),
  loading: false,
};

const checkoutMutationFn = vi.fn();
const portalMutationFn = vi.fn();

vi.mock("@apollo/client", () => ({
  gql: (strings, ...values) => String.raw({ raw: strings }, ...values),
  useQuery: (query) => {
    const q = typeof query === "string" ? query : "";
    if (q.includes("currentUser") || q.includes("CurrentUser")) {
      return { data: { currentUser: owner }, loading: false, refetch: vi.fn() };
    }
    if (
      q.includes("myStudioSubscription") ||
      q.includes("MyStudioSubscription")
    ) {
      return {
        data: { myStudioSubscription: queryState.sub },
        loading: queryState.loading,
        refetch: vi.fn(),
      };
    }
    return { data: {}, loading: false, refetch: vi.fn() };
  },
  useMutation: (mutation) => {
    const m = typeof mutation === "string" ? mutation : "";
    if (
      m.includes("CreatePlatformSubscriptionCheckout") ||
      m.includes("createPlatformSubscriptionCheckout")
    ) {
      return [checkoutMutationFn, { loading: false }];
    }
    if (
      m.includes("CreateBillingPortalSession") ||
      m.includes("createBillingPortalSession")
    ) {
      return [portalMutationFn, { loading: false }];
    }
    return [vi.fn(), { loading: false }];
  },
  InMemoryCache: class {},
}));
vi.mock("../../apollo/client", () => ({ default: {} }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Lazy import ───────────────────────────────────────────────────────────────

let OwnerSubscription;
beforeEach(async () => {
  queryState.sub = makeSubscription();
  queryState.loading = false;
  checkoutMutationFn.mockReset();
  portalMutationFn.mockReset();
  setMockAuth({ user: owner });

  if (!OwnerSubscription) {
    const mod = await import("../../pages/owner/settings/OwnerSubscription");
    OwnerSubscription = mod.default;
  }
});

function renderPage(url = "/owner/subscription") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <OwnerSubscription />
    </MemoryRouter>,
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("OwnerSubscription page", () => {
  describe("basic rendering", () => {
    it("renders the page heading", () => {
      renderPage();
      expect(screen.getByText("Subscription")).toBeTruthy();
    });

    it("renders all three plan cards", () => {
      renderPage();
      expect(screen.getAllByText("Starter").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Studio").length).toBeGreaterThan(0);
    });

    it("shows Free for starter tier and dollar amounts for paid tiers", () => {
      renderPage();
      expect(screen.getByText("Free")).toBeTruthy();
      expect(screen.getAllByText("$79").length).toBeGreaterThan(0);
      expect(screen.getAllByText("$175").length).toBeGreaterThan(0);
    });

    it("shows loading state while subscription is fetching", () => {
      queryState.loading = true;
      queryState.sub = null;
      renderPage();
      expect(screen.getByText(/loading subscription/i)).toBeTruthy();
    });
  });

  describe("current plan banner", () => {
    it("displays the current plan tier name", () => {
      queryState.sub = makeSubscription({ tier: "pro", status: "active" });
      renderPage();
      // h2 shows "Pro" as the plan name in the banner
      expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);
    });

    it("shows active status badge", () => {
      queryState.sub = makeSubscription({ status: "active" });
      renderPage();
      expect(screen.getByText("active")).toBeTruthy();
    });

    it("shows trialing status badge and trial callout", () => {
      queryState.sub = makeSubscription({ status: "trialing" });
      renderPage();
      expect(screen.getByText("trialing")).toBeTruthy();
      expect(screen.getByText(/free trial/i)).toBeTruthy();
    });

    it("shows past_due warning banner", () => {
      queryState.sub = makeSubscription({ status: "past_due" });
      renderPage();
      // Badge shows "past due" and the warning callout also mentions it
      expect(screen.getAllByText(/past.?due/i).length).toBeGreaterThan(0);
    });

    it("shows cancelled warning and prompts to resubscribe", () => {
      queryState.sub = makeSubscription({ status: "cancelled", active: false });
      renderPage();
      expect(screen.getByText("cancelled")).toBeTruthy();
      expect(
        screen.getByText(/select a plan below to resubscribe/i),
      ).toBeTruthy();
    });

    it("shows Manage Billing button", () => {
      renderPage();
      expect(
        screen.getByRole("button", { name: /manage billing/i }),
      ).toBeTruthy();
    });

    it("shows subdomain when studio slug is present", () => {
      queryState.sub = makeSubscription({
        studio: {
          id: "studio-1",
          name: "Test Studio",
          slug: "my-studio",
          __typename: "Studio",
        },
      });
      renderPage();
      expect(screen.getByText(/my-studio\.studioflow\.app/)).toBeTruthy();
    });
  });

  describe("no subscription state", () => {
    it("shows prompt to choose a plan when no subscription exists", () => {
      queryState.sub = null;
      renderPage();
      expect(screen.getByText(/no active subscription yet/i)).toBeTruthy();
    });
  });

  describe("checkout flow", () => {
    it("calls checkout mutation when Subscribe button is clicked", async () => {
      queryState.sub = makeSubscription({
        tier: "starter",
        status: "active",
        active: true,
      });
      checkoutMutationFn.mockResolvedValue({
        data: {
          createPlatformSubscriptionCheckout: {
            checkoutUrl: "https://stripe.com/checkout",
            errors: [],
          },
        },
      });

      renderPage();
      const upgradeBtn = screen.getByText(/subscribe to pro/i);
      fireEvent.click(upgradeBtn);

      await waitFor(() =>
        expect(checkoutMutationFn).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: {
              tier: "pro",
              currency: "cad",
              billingInterval: "month",
            },
          }),
        ),
      );
    });

    it("calls checkout mutation with studio tier", async () => {
      queryState.sub = null;
      checkoutMutationFn.mockResolvedValue({
        data: {
          createPlatformSubscriptionCheckout: {
            checkoutUrl: "https://stripe.com/checkout",
            errors: [],
          },
        },
      });

      renderPage();
      const studioBtn = screen.getByText(/subscribe to studio/i);
      fireEvent.click(studioBtn);

      await waitFor(() =>
        expect(checkoutMutationFn).toHaveBeenCalledWith(
          expect.objectContaining({
            variables: {
              tier: "studio",
              currency: "cad",
              billingInterval: "month",
            },
          }),
        ),
      );
    });

    it("shows inline error when checkout mutation returns errors", async () => {
      queryState.sub = null;
      checkoutMutationFn.mockResolvedValue({
        data: {
          createPlatformSubscriptionCheckout: {
            checkoutUrl: null,
            errors: ["Stripe price not configured"],
          },
        },
      });

      renderPage();
      fireEvent.click(screen.getByText(/subscribe to pro/i));

      await waitFor(() =>
        expect(screen.getByText("Stripe price not configured")).toBeTruthy(),
      );
    });

    it("shows inline error when checkout mutation throws", async () => {
      queryState.sub = null;
      checkoutMutationFn.mockRejectedValue(new Error("Network error"));

      renderPage();
      fireEvent.click(screen.getByText(/subscribe to pro/i));

      await waitFor(() =>
        expect(screen.getByText("Network error")).toBeTruthy(),
      );
    });
  });

  describe("billing portal flow", () => {
    it("calls billing portal mutation when Manage Billing is clicked", async () => {
      portalMutationFn.mockResolvedValue({
        data: {
          createBillingPortalSession: {
            portalUrl: "https://billing.stripe.com/p",
            errors: [],
          },
        },
      });

      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /manage billing/i }));

      await waitFor(() => expect(portalMutationFn).toHaveBeenCalled());
    });

    it("shows portal error message when mutation returns errors", async () => {
      portalMutationFn.mockResolvedValue({
        data: {
          createBillingPortalSession: {
            portalUrl: null,
            errors: ["No billing account found"],
          },
        },
      });

      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /manage billing/i }));

      await waitFor(() =>
        expect(screen.getByText("No billing account found")).toBeTruthy(),
      );
    });
  });

  describe("checkout return banners", () => {
    it("shows success banner when ?checkout_success=1 is in URL", () => {
      renderPage("/owner/subscription?checkout_success=1");
      expect(screen.getByText(/payment successful/i)).toBeTruthy();
    });

    it("shows cancelled banner when ?checkout_cancelled=1 is in URL", () => {
      renderPage("/owner/subscription?checkout_cancelled=1");
      expect(screen.getByText(/checkout was cancelled/i)).toBeTruthy();
    });
  });

  describe("access control", () => {
    it("redirects non-owner users to /dashboard", () => {
      setMockAuth({ user: { ...owner, role: 3, roleName: "client" } });
      renderPage();
      // Navigate renders null; page content should be absent
      expect(screen.queryByText("Subscription")).toBeFalsy();
    });

    it("redirects unauthenticated users", () => {
      setMockAuth({ user: null });
      renderPage();
      expect(screen.queryByText("Subscription")).toBeFalsy();
    });
  });
});
