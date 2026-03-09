import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }) => children,
  CardElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => null,
}));

const addToast = vi.fn();
vi.mock("../../components/shared/ToastProvider", () => ({
  useToast: () => ({ addToast }),
  ToastProvider: ({ children }) => children,
}));

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "u-1",
      email: "client@example.com",
      name: "Client",
      role: 2,
      roleName: "client",
      active: true,
      availableForSessions: false,
      studioId: "studio-a",
      godmode: false,
    },
  }),
}));

import BookingShow from "../../pages/shared/BookingShow.jsx";
import {
  MY_BOOKINGS,
  PAYMENT_PUBLIC_SETTINGS,
  MY_CLIENT,
} from "../../apollo/queries.js";

describe("Client BookingShow bundle credit receipt", () => {
  beforeEach(() => {
    addToast.mockReset();
  });

  it("shows paid with bundle credit when bundlePurchase is present", async () => {
    const bookingId = "b-bundle-1";
    const studioId = "studio-1";

    const booking = {
      __typename: "Booking",
      id: bookingId,
      studioId,
      slug: null,
      status: "booked",
      paid: true,
      priceCents: 2400,
      archived: false,
      createdAt: new Date("2026-03-01T10:00:00Z").toISOString(),
      payment: null,
      bundlePurchase: {
        __typename: "BundlePurchase",
        id: "bp-1",
        creditsTotal: 10,
        creditsRemaining: 9,
        bundleProduct: {
          __typename: "BundleProduct",
          id: "prod-1",
          title: "10 Class Pack",
        },
      },
      client: {
        __typename: "Client",
        id: "c-1",
        name: "Client",
        email: "client@example.com",
      },
      classSession: {
        __typename: "ClassSession",
        id: "sess-1",
        startTime: new Date("2026-03-05T10:30:00Z").toISOString(),
        room: "A",
        instructor: { __typename: "User", id: "inst-1", name: "Alex" },
        classTemplate: {
          __typename: "ClassTemplate",
          id: "t-1",
          title: "Reformer",
          priceCents: 2400,
          currency: "cad",
          durationMinutes: 50,
        },
      },
    };

    const mocks = [
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [booking] } },
      },
      {
        request: { query: PAYMENT_PUBLIC_SETTINGS, variables: { studioId } },
        result: {
          data: {
            paymentPublicSettings: {
              __typename: "PaymentPublicSetting",
              stripePublishableKey: null,
              defaultCurrency: "cad",
              enabled: true,
              configured: true,
            },
          },
        },
      },
      {
        request: { query: MY_CLIENT, variables: { studioId } },
        result: { data: { myClient: null } },
      },
    ];

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={[`/bookings/${bookingId}`]}>
          <Routes>
            <Route path="/bookings/:id" element={<BookingShow />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    );

    expect(await screen.findByText(/Booking details/i)).toBeInTheDocument();
    expect(await screen.findByText(/Bundle credit/i)).toBeInTheDocument();
    expect(await screen.findByText(/10 Class Pack/i)).toBeInTheDocument();
    expect(await screen.findByText(/9\s*\/\s*10/i)).toBeInTheDocument();
    expect(await screen.findByText(/1 credit/i)).toBeInTheDocument();
  });
});
