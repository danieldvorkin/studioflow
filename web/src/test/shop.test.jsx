import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import "./mocks/baseMocks";
import { setMockAuth, getMockAddToast } from "./mocks/baseMocks";
import { ownerUser, clientUser } from "./helpers/users";

// ---------------------------------------------------------------------------
// Studio mock
// ---------------------------------------------------------------------------
const studioState = {
  selectedStudioId: "studio-1",
  studios: [{ id: "studio-1", name: "Main Studio" }],
  setSelectedStudioId: vi.fn(),
  loading: false,
};

vi.mock("../studio/StudioProvider", () => ({
  useStudio: () => studioState,
  StudioProvider: ({ children }) => children,
}));

// ---------------------------------------------------------------------------
// Apollo mock — stateful, keyword-based query dispatch
// ---------------------------------------------------------------------------
const apolloState = {
  currentUser: null,
  shopItems: [],
  shopOrders: [],
  loading: false,
  stripeConfigured: true,
};

const mutationFn = vi.fn();

vi.mock("@apollo/client", () => ({
  gql: (strings, ...values) => String.raw({ raw: strings }, ...values),
  useQuery: (query) => {
    const q = typeof query === "string" ? query : "";
    if (q.includes("currentUser") || q.includes("CurrentUser")) {
      return {
        data: apolloState.currentUser
          ? { currentUser: apolloState.currentUser }
          : undefined,
        loading: apolloState.loading,
        refetch: vi.fn(),
      };
    }
    if (
      q.includes("paymentSettings") ||
      q.includes("PaymentSettings") ||
      q.includes("paymentPublicSettings") ||
      q.includes("PaymentPublicSettings")
    ) {
      return {
        data: {
          paymentSettings: {
            configured: apolloState.stripeConfigured,
            enabled: apolloState.stripeConfigured,
            stripePublishableKey: apolloState.stripeConfigured
              ? "pk_test"
              : null,
          },
          paymentPublicSettings: {
            configured: apolloState.stripeConfigured,
            enabled: apolloState.stripeConfigured,
            stripePublishableKey: apolloState.stripeConfigured
              ? "pk_test"
              : null,
          },
        },
        loading: false,
        refetch: vi.fn(),
      };
    }
    if (q.includes("shopOrders") || q.includes("ShopOrders")) {
      return {
        data: { shopOrders: apolloState.shopOrders },
        loading: apolloState.loading,
        refetch: vi.fn(),
      };
    }
    if (q.includes("shopItems") || q.includes("ShopItems")) {
      return {
        data: { shopItems: apolloState.shopItems },
        loading: apolloState.loading,
        refetch: vi.fn(),
      };
    }
    return { data: undefined, loading: false, refetch: vi.fn() };
  },
  useMutation: () => [mutationFn, { loading: false }],
}));

vi.mock("../../apollo/client", () => ({ default: {} }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeShopItem(overrides = {}) {
  return {
    id: "1",
    title: "Yoga Mat",
    description: "High-quality mat",
    priceCents: 3500,
    currency: "cad",
    itemType: "sale",
    stockQuantity: null,
    active: true,
    inStock: true,
    imageUrl: null,
    createdAt: "2026-03-04T00:00:00Z",
    ...overrides,
  };
}

function makeShopOrder(overrides = {}) {
  return {
    id: "10",
    quantity: 1,
    totalCents: 3500,
    currency: "cad",
    status: "pending",
    rentalDueDate: null,
    returnedAt: null,
    notes: null,
    createdAt: "2026-03-04T00:00:00Z",
    shopItem: {
      id: "1",
      title: "Yoga Mat",
      itemType: "sale",
      priceCents: 3500,
      currency: "cad",
    },
    client: { id: "c1", name: "Alice", email: "alice@example.com" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// reset between tests
// ---------------------------------------------------------------------------
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  apolloState.currentUser = null;
  apolloState.shopItems = [];
  apolloState.shopOrders = [];
  apolloState.loading = false;
  apolloState.stripeConfigured = true;
  studioState.selectedStudioId = "studio-1";
});

// ---------------------------------------------------------------------------
// Shop page (client-facing)
// ---------------------------------------------------------------------------
import ShopPage from "../pages/Shop";

describe("ShopPage", () => {
  beforeEach(() => {
    apolloState.currentUser = clientUser();
    setMockAuth({ user: clientUser() });
  });

  it("renders the page heading", () => {
    render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Shop")).toBeInTheDocument();
    expect(screen.getByText(/Browse items/i)).toBeInTheDocument();
  });

  it("shows items returned by the query", () => {
    apolloState.shopItems = [makeShopItem()];
    render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Yoga Mat")).toBeInTheDocument();
  });

  it("shows 'no items' when the shop is empty", () => {
    apolloState.shopItems = [];
    render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/No items are available/i)).toBeInTheDocument();
  });

  it("renders a rental item with a Rent button", () => {
    apolloState.shopItems = [
      makeShopItem({ itemType: "rental", title: "Foam Roller" }),
    ];
    render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Foam Roller")).toBeInTheDocument();
    // The card has a "Rent this item" button
    expect(
      screen.getByRole("button", { name: /rent this item/i }),
    ).toBeInTheDocument();
  });

  it("renders a sale item with a Buy button", () => {
    apolloState.shopItems = [
      makeShopItem({ itemType: "sale", title: "Water Bottle" }),
    ];
    render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /buy/i })).toBeInTheDocument();
  });

  it("shows out of stock state when item has 0 stock", () => {
    apolloState.shopItems = [
      makeShopItem({ stockQuantity: 0, inStock: false }),
    ];
    render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    // Both the stock indicator and the button show "Out of stock"
    expect(screen.getAllByText(/Out of stock/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /out of stock/i }),
    ).toBeDisabled();
  });

  it("filters by type when a filter button is clicked", () => {
    apolloState.shopItems = [
      makeShopItem({ itemType: "sale", title: "Mat" }),
      makeShopItem({ id: "2", itemType: "rental", title: "Roller" }),
    ];
    render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    // Both visible before filter
    expect(screen.getByText("Mat")).toBeInTheDocument();
    expect(screen.getByText("Roller")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^sale$/i }));
    expect(screen.getByText("Mat")).toBeInTheDocument();
    expect(screen.queryByText("Roller")).not.toBeInTheDocument();
  });

  it("filters by search text", () => {
    apolloState.shopItems = [
      makeShopItem({ title: "Yoga Mat" }),
      makeShopItem({ id: "2", title: "Foam Roller" }),
    ];
    render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    const searchInput = screen.getByPlaceholderText(/Search items/i);
    fireEvent.change(searchInput, { target: { value: "foam" } });
    expect(screen.queryByText("Yoga Mat")).not.toBeInTheDocument();
    expect(screen.getByText("Foam Roller")).toBeInTheDocument();
  });

  it("shows 'no items' message on first render if studio has no shop items", () => {
    apolloState.shopItems = [];
    render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/No items are available/i)).toBeInTheDocument();
    // Toast should NOT fire on initial render
    expect(getMockAddToast()).not.toHaveBeenCalled();
  });

  it("shows toast (but stays on shop page) when studio is switched to one with no shop items", async () => {
    // Initial render: studio-1 with empty items — no redirect on first render.
    apolloState.shopItems = [];
    studioState.selectedStudioId = "studio-1";
    const { rerender } = render(
      <MemoryRouter>
        <ShopPage />
      </MemoryRouter>,
    );
    expect(getMockAddToast()).not.toHaveBeenCalled();

    // Simulate studio switch to studio-2 which also has no items.
    studioState.selectedStudioId = "studio-2";
    await act(async () => {
      rerender(
        <MemoryRouter>
          <ShopPage />
        </MemoryRouter>,
      );
    });

    expect(getMockAddToast()).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "info",
        message: expect.stringMatching(/no shop/i),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// OwnerShop page (owner-facing management)
// ---------------------------------------------------------------------------
import OwnerShopPage from "../pages/OwnerShop";

describe("OwnerShopPage", () => {
  beforeEach(() => {
    apolloState.currentUser = ownerUser();
    setMockAuth({ user: ownerUser() });
  });

  function renderOwnerShop() {
    return render(
      <MemoryRouter>
        <OwnerShopPage />
      </MemoryRouter>,
    );
  }

  it("renders the page heading", () => {
    renderOwnerShop();
    expect(screen.getByText("Shop Management")).toBeInTheDocument();
  });

  it("shows the Items and Orders tabs", () => {
    renderOwnerShop();
    expect(screen.getByRole("button", { name: /Items/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Orders/i })).toBeInTheDocument();
  });

  it("shows '+ Add item' button on items tab", () => {
    renderOwnerShop();
    expect(
      screen.getByRole("button", { name: /Add item/i }),
    ).toBeInTheDocument();
  });

  it("reveals the create form when '+ Add item' is clicked", () => {
    renderOwnerShop();
    fireEvent.click(screen.getByRole("button", { name: /Add item/i }));
    expect(screen.getByPlaceholderText(/Yoga mat/i)).toBeInTheDocument();
  });

  it("hides the create form when Cancel is clicked after opening", () => {
    renderOwnerShop();
    fireEvent.click(screen.getByRole("button", { name: /Add item/i }));
    // Two Cancel buttons appear: the toggle and the ItemForm's cancel button.
    // Click the first one to close.
    fireEvent.click(screen.getAllByRole("button", { name: /^Cancel$/i })[0]);
    expect(screen.queryByPlaceholderText(/Yoga mat/i)).not.toBeInTheDocument();
  });

  it("displays existing shop items", () => {
    apolloState.shopItems = [makeShopItem({ title: "Premium Strap" })];
    renderOwnerShop();
    expect(screen.getByText("Premium Strap")).toBeInTheDocument();
  });

  it("shows 'No shop items yet' when items list is empty", () => {
    apolloState.shopItems = [];
    renderOwnerShop();
    expect(screen.getByText(/No shop items yet/i)).toBeInTheDocument();
  });

  it("switches to Orders tab when clicked", () => {
    apolloState.shopOrders = [];
    renderOwnerShop();
    fireEvent.click(screen.getAllByRole("button", { name: /Orders/i })[0]);
    expect(screen.getByText(/No orders yet/i)).toBeInTheDocument();
  });

  it("displays existing orders on the Orders tab", () => {
    apolloState.shopOrders = [makeShopOrder()];
    renderOwnerShop();
    fireEvent.click(screen.getAllByRole("button", { name: /Orders/i })[0]);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Yoga Mat")).toBeInTheDocument();
  });

  it("shows access denied message for non-owner/staff users", () => {
    apolloState.currentUser = clientUser();
    setMockAuth({ user: clientUser() });
    render(
      <MemoryRouter>
        <OwnerShopPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Shop management is for studio owners and staff only/i),
    ).toBeInTheDocument();
  });
});
