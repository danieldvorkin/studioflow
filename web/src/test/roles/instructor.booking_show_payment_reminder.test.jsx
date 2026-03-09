import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const addToast = vi.fn();
vi.mock("../../components/shared/ToastProvider", () => ({
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

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "inst-1",
      email: "alex@example.com",
      name: "Alex",
      role: 3,
      roleName: "instructor",
      active: true,
      availableForSessions: true,
      studioId: "studio-1",
      godmode: false,
    },
  }),
}));

import BookingShow from "../../pages/shared/BookingShow.jsx";
import { BOOKINGS, PAYMENT_PUBLIC_SETTINGS } from "../../apollo/queries.js";
import { SEND_BOOKING_PAYMENT_REMINDER } from "../../apollo/mutations.js";

describe("Instructor BookingShow payment reminder", () => {
  beforeEach(() => {
    addToast.mockReset();
  });

  it("shows Send payment reminder and calls mutation", async () => {
    const bookingId = "b-2";
    const studioId = "studio-1";

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
        id: "sess-2",
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
        request: { query: BOOKINGS, variables: {} },
        result: { data: { bookings: [booking] } },
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
        request: {
          query: SEND_BOOKING_PAYMENT_REMINDER,
          variables: { bookingId },
        },
        result: {
          data: {
            sendBookingPaymentReminder: {
              __typename: "SendBookingPaymentReminderPayload",
              success: true,
              checkoutUrl: "https://stripe.test/checkout",
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

    const btn = await screen.findByRole("button", {
      name: /send payment reminder/i,
    });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(addToast).toHaveBeenCalled();
    });

    const messages = addToast.mock.calls
      .map((c) => c?.[0]?.message)
      .filter(Boolean);
    expect(messages.join(" ")).toMatch(/reminder sent/i);
  });
});
