import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const addToast = vi.fn();
vi.mock("../../components/ToastProvider", () => ({
  useToast: () => ({ addToast }),
  ToastProvider: ({ children }) => children,
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }) => children,
  CardElement: () => null,
  useStripe: () => null,
  useElements: () => null,
}));

vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => null,
}));

const { redirectToExternalUrl } = vi.hoisted(() => ({
  redirectToExternalUrl: vi.fn(),
}));

vi.mock("../../payments/redirectToExternalUrl", () => ({
  redirectToExternalUrl,
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

import BookingShow from "../../pages/BookingShow.jsx";
import {
  MY_BOOKINGS,
  PAYMENT_PUBLIC_SETTINGS,
  MY_CLIENT,
} from "../../apollo/queries.js";
import { CREATE_BOOKING_CHECKOUT_SESSION } from "../../apollo/mutations.js";

describe("Client BookingShow pay now", () => {
  beforeEach(() => {
    addToast.mockReset();
    redirectToExternalUrl.mockClear();
  });

  afterEach(() => {
    // noop
  });

  it("shows Pay now and redirects to Stripe checkout", async () => {
    const bookingId = "b-1";
    const studioId = "studio-b";

    const booking = {
      __typename: "Booking",
      id: bookingId,
      studioId,
      slug: null,
      status: "booked",
      paid: false,
      priceCents: 2400,
      archived: false,
      createdAt: new Date("2026-03-01T10:00:00Z").toISOString(),
      payment: null,
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
      {
        request: {
          query: CREATE_BOOKING_CHECKOUT_SESSION,
          variables: { bookingId },
        },
        result: {
          data: {
            createBookingCheckoutSession: {
              __typename: "CreateBookingCheckoutSessionPayload",
              checkoutUrl: "https://stripe.test/checkout",
              checkoutSessionId: "cs_test_123",
              errors: [],
            },
          },
        },
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
    const payNow = await screen.findByRole("button", { name: /pay now/i });

    fireEvent.click(payNow);

    // Apollo mutation resolves async
    await waitFor(() => {
      expect(redirectToExternalUrl).toHaveBeenCalled();
    });
    expect(redirectToExternalUrl).toHaveBeenCalledWith(
      "https://stripe.test/checkout",
    );
  });
});
