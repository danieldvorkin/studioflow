import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter } from "react-router-dom";

import "../mocks/baseMocks";
import { setMockAuth } from "../mocks/baseMocks";
import { clientUser } from "../helpers/users";
import { currentUserMock } from "../helpers/apolloMocks";
import { MY_SHOP_ORDERS } from "../../apollo/queries";

import MyOrdersPage from "../../pages/MyOrders.jsx";

const emptyOrdersMock = {
  request: { query: MY_SHOP_ORDERS, variables: {} },
  result: { data: { myShopOrders: [] } },
};

const sampleOrder = {
  __typename: "ShopOrder",
  id: "order-1",
  quantity: 1,
  totalCents: 4500,
  currency: "cad",
  status: "paid",
  rentalDueDate: null,
  returnedAt: null,
  notes: null,
  rentalAgreementAcceptedAt: null,
  stripePaymentIntentId: "pi_test_123",
  createdAt: new Date("2026-03-01T12:00:00Z").toISOString(),
  shopItem: {
    __typename: "ShopItem",
    id: "item-1",
    title: "Resistance Band Set",
    itemType: "sale",
    priceCents: 4500,
    currency: "cad",
    imageUrl: null,
  },
  client: {
    __typename: "Client",
    id: "c-1",
    name: "Sam Client",
    email: "sam@example.com",
  },
};

const withOrdersMock = {
  request: { query: MY_SHOP_ORDERS, variables: {} },
  result: { data: { myShopOrders: [sampleOrder] } },
};

function renderPage(mocks) {
  return render(
    <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
      <MemoryRouter initialEntries={["/my-orders"]}>
        <MyOrdersPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

const client = clientUser({
  id: "client-user-1",
  name: "Sam Client",
  email: "sam@example.com",
});

beforeEach(() => {
  setMockAuth({ user: client });
});

afterEach(cleanup);

describe("Client — My Orders page", () => {
  it('shows the "My Orders" heading', async () => {
    renderPage([currentUserMock(client), emptyOrdersMock]);
    expect(
      await screen.findByRole("heading", { name: "My Orders" }),
    ).toBeInTheDocument();
  });

  it('shows "No orders yet." when the client has no orders', async () => {
    renderPage([currentUserMock(client), emptyOrdersMock]);
    await screen.findByRole("heading", { name: "My Orders" });
    expect(await screen.findByText(/No orders yet\./i)).toBeInTheDocument();
  });

  it('includes a "Browse the shop" link when empty', async () => {
    renderPage([currentUserMock(client), emptyOrdersMock]);
    await screen.findByRole("heading", { name: "My Orders" });
    await screen.findByText(/No orders yet\./i);
    expect(screen.getByText(/Browse the shop/i)).toBeInTheDocument();
  });

  it("shows the shop-item title when an order exists", async () => {
    renderPage([currentUserMock(client), withOrdersMock]);
    await screen.findByRole("heading", { name: "My Orders" });
    expect(await screen.findByText("Resistance Band Set")).toBeInTheDocument();
  });

  it("shows the order status badge", async () => {
    renderPage([currentUserMock(client), withOrdersMock]);
    await screen.findByRole("heading", { name: "My Orders" });
    await screen.findByText("Resistance Band Set");
    expect(screen.getAllByText(/paid/i).length).toBeGreaterThan(0);
  });
});
