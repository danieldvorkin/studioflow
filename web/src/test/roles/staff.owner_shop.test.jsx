import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter } from "react-router-dom";

import "../mocks/baseMocks";
import { setMockAuth } from "../mocks/baseMocks";
import { ownerUser, staffUser, clientUser } from "../helpers/users";
import { currentUserMock } from "../helpers/apolloMocks";
import { PAYMENT_SETTINGS } from "../../apollo/queries";

import OwnerShopPage from "../../pages/OwnerShop.jsx";

const stripeNotConfiguredMock = {
  request: { query: PAYMENT_SETTINGS, variables: {} },
  result: {
    data: {
      paymentSettings: {
        __typename: "PaymentSetting",
        id: "ps-1",
        stripePublishableKey: null,
        defaultCurrency: "cad",
        enabled: false,
        configured: false,
        dashboardTitle: "StudioFlow",
        defaultTheme: "dark",
        ownerPageLayout: {},
        clientsPageEnabled: true,
      },
    },
  },
};

function renderPage(user, extraMocks = []) {
  return render(
    <MockedProvider
      mocks={[currentUserMock(user), ...extraMocks]}
      cache={new InMemoryCache()}
    >
      <MemoryRouter initialEntries={["/owner/shop"]}>
        <OwnerShopPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(cleanup);

describe("Owner Shop page — client blocked", () => {
  beforeEach(() => {
    setMockAuth({ user: clientUser() });
  });

  it("shows the access-denied message for client users", async () => {
    renderPage(clientUser());
    expect(
      await screen.findByText(
        /Shop management is for studio owners and staff only/i,
      ),
    ).toBeInTheDocument();
  });
});

describe("Owner Shop page — staff access", () => {
  beforeEach(() => {
    setMockAuth({ user: staffUser() });
  });

  it('shows "Stripe not configured" warning when Stripe is not set up', async () => {
    renderPage(staffUser(), [stripeNotConfiguredMock]);
    expect(
      await screen.findByText(/Stripe not configured/i),
    ).toBeInTheDocument();
  });

  it("does not show the client-blocked message to staff", async () => {
    renderPage(staffUser(), [stripeNotConfiguredMock]);
    await screen.findByText(/Stripe not configured/i);
    expect(
      screen.queryByText(/Studio owners and staff only/i),
    ).not.toBeInTheDocument();
  });
});

describe("Owner Shop page — owner access", () => {
  beforeEach(() => {
    setMockAuth({ user: ownerUser() });
  });

  it('shows "Stripe not configured" warning for owner when Stripe is not set up', async () => {
    renderPage(ownerUser(), [stripeNotConfiguredMock]);
    expect(
      await screen.findByText(/Stripe not configured/i),
    ).toBeInTheDocument();
  });

  it("does not show the client-blocked message to owner", async () => {
    renderPage(ownerUser(), [stripeNotConfiguredMock]);
    await screen.findByText(/Stripe not configured/i);
    expect(
      screen.queryByText(/Studio owners and staff only/i),
    ).not.toBeInTheDocument();
  });
});
