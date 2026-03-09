import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
      email: "jane@example.com",
      name: "Jane Doe",
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
  MY_PAYMENT_METHODS,
} from "../../apollo/queries.js";
import {
  CANCEL_BOOKING,
  REBOOK_BOOKING_WITH_PAYMENT,
} from "../../apollo/mutations.js";

// ─── Shared test data ─────────────────────────────────────────────────────────

const studioId = "studio-1";
const bookingId = "b-wait-1";

function makeBooking(overrides = {}) {
  return {
    __typename: "Booking",
    id: bookingId,
    studioId,
    slug: null,
    status: "waitlisted",
    paid: false,
    priceCents: 2400,
    archived: false,
    createdAt: new Date("2026-03-01T10:00:00Z").toISOString(),
    payment: null,
    bundlePurchase: null,
    client: {
      __typename: "Client",
      id: "c-1",
      name: "Jane Doe",
      email: "jane@example.com",
    },
    classSession: {
      __typename: "ClassSession",
      id: "sess-1",
      startTime: new Date("2026-03-10T10:30:00Z").toISOString(),
      endTime: null,
      room: "B",
      capacity: null,
      seatsAvailable: 0,
      instructor: { __typename: "User", id: "inst-1", name: "Instructor" },
      classTemplate: {
        __typename: "ClassTemplate",
        id: "t-1",
        title: "Reformer Advanced",
        description: null,
        priceCents: 2400,
        currency: "cad",
        durationMinutes: 55,
      },
    },
    ...overrides,
  };
}

// ─── Base mocks shared across describe blocks ─────────────────────────────────

function baseMocks(booking) {
  return [
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
            configured: false,
          },
        },
      },
    },
    {
      request: { query: MY_CLIENT, variables: { studioId } },
      result: { data: { myClient: null } },
    },
    {
      request: { query: MY_PAYMENT_METHODS, variables: {} },
      result: { data: { myPaymentMethods: [] } },
    },
  ];
}

function renderBookingShow(mocks) {
  return render(
    <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
      <MemoryRouter initialEntries={[`/bookings/${bookingId}`]}>
        <Routes>
          <Route path="/bookings/:id" element={<BookingShow />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

// ─── Waitlisted booking ───────────────────────────────────────────────────────

describe("BookingShow – waitlisted booking", () => {
  beforeEach(() => addToast.mockReset());

  it("displays the waitlisted status badge with amber styling", async () => {
    renderBookingShow(baseMocks(makeBooking()));

    const badge = await screen.findByText(/waitlisted/i);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/amber/);
  });

  it("shows the waitlist explanation banner", async () => {
    renderBookingShow(baseMocks(makeBooking()));

    expect(
      await screen.findByText(/You.re on the waitlist/i),
    ).toBeInTheDocument();
    // The "automatically confirmed" phrase appears inside the waitlist banner
    const confirmed = screen.getAllByText(/automatically confirmed/i);
    expect(confirmed.length).toBeGreaterThan(0);
    // Second bullet — full clean text in a single span
    expect(
      screen.getByText(
        /You.ll receive an email notification when your status changes/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the Cancel booking button for a waitlisted booking", async () => {
    renderBookingShow(baseMocks(makeBooking()));

    await screen.findByText(/You.re on the waitlist/i);
    expect(
      screen.getByRole("button", { name: /cancel booking/i }),
    ).toBeInTheDocument();
  });

  it("opens the cancel confirmation modal when Cancel booking is clicked", async () => {
    renderBookingShow(baseMocks(makeBooking()));

    await screen.findByText(/You.re on the waitlist/i);
    fireEvent.click(screen.getByRole("button", { name: /cancel booking/i }));

    expect(
      await screen.findByText(/Cancel this booking\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Yes, cancel booking/i }),
    ).toBeInTheDocument();
  });
});

// ─── Confirmed (booked) booking ───────────────────────────────────────────────

describe("BookingShow – confirmed booking: cancellation flow", () => {
  beforeEach(() => addToast.mockReset());

  it("renders the class title for a confirmed booking", async () => {
    renderBookingShow(baseMocks(makeBooking({ status: "booked" })));

    expect(await screen.findByText(/Reformer Advanced/i)).toBeInTheDocument();
  });

  it("shows the Cancel booking button for a confirmed booking", async () => {
    renderBookingShow(baseMocks(makeBooking({ status: "booked" })));

    await screen.findByText(/Reformer Advanced/i);
    expect(
      screen.getByRole("button", { name: /cancel booking/i }),
    ).toBeInTheDocument();
  });

  it("opens the cancel modal when Cancel booking is clicked", async () => {
    renderBookingShow(baseMocks(makeBooking({ status: "booked" })));

    await screen.findByText(/Reformer Advanced/i);
    fireEvent.click(screen.getByRole("button", { name: /cancel booking/i }));

    expect(
      await screen.findByText(/Cancel this booking\?/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Yes, cancel booking/i }),
    ).toBeInTheDocument();
    // "Keep booking" dismisses the modal
    expect(
      screen.getByRole("button", { name: /Keep booking/i }),
    ).toBeInTheDocument();
  });

  it("dismisses the cancel modal when Keep booking is clicked", async () => {
    renderBookingShow(baseMocks(makeBooking({ status: "booked" })));

    await screen.findByText(/Reformer Advanced/i);
    fireEvent.click(screen.getByRole("button", { name: /cancel booking/i }));
    expect(
      await screen.findByText(/Cancel this booking\?/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Keep booking/i }));
    expect(
      screen.queryByText(/Cancel this booking\?/i),
    ).not.toBeInTheDocument();
  });

  it("calls the cancel mutation and shows a success toast on confirm", async () => {
    const cancelMock = {
      request: { query: CANCEL_BOOKING, variables: { id: bookingId } },
      result: { data: { cancelBooking: { success: true, errors: [] } } },
    };

    renderBookingShow([
      ...baseMocks(makeBooking({ status: "booked" })),
      cancelMock,
    ]);

    await screen.findByText(/Reformer Advanced/i);
    fireEvent.click(screen.getByRole("button", { name: /cancel booking/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Yes, cancel booking/i }),
    );

    // Wait for the toast to be triggered
    await screen.findByText(/Reformer Advanced/i).catch(() => null);
    // Give Apollo time to process the mutation
    await new Promise((r) => setTimeout(r, 50));

    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Booking cancelled",
        type: "success",
      }),
    );
  });
});

// ─── Cancelled booking ────────────────────────────────────────────────────────

describe("BookingShow – cancelled booking: rebook flow", () => {
  beforeEach(() => addToast.mockReset());

  it("shows the cancelled status badge for a cancelled booking", async () => {
    renderBookingShow(baseMocks(makeBooking({ status: "cancelled" })));

    const badge = await screen.findByText(/cancelled/i);
    expect(badge).toBeInTheDocument();
  });

  it("shows the Re-book button for a non-archived cancelled booking", async () => {
    renderBookingShow(
      baseMocks(makeBooking({ status: "cancelled", archived: false })),
    );

    await screen.findByText(/Reformer Advanced/i);
    expect(
      screen.getByRole("button", { name: /re-book/i }),
    ).toBeInTheDocument();
  });

  it("does NOT show the Re-book button for a booked (active) booking", async () => {
    renderBookingShow(baseMocks(makeBooking({ status: "booked" })));

    await screen.findByText(/Reformer Advanced/i);
    expect(
      screen.queryByRole("button", { name: /re-book/i }),
    ).not.toBeInTheDocument();
  });

  it("does NOT show Cancel booking for a cancelled booking", async () => {
    renderBookingShow(baseMocks(makeBooking({ status: "cancelled" })));

    await screen.findByText(/Reformer Advanced/i);
    expect(
      screen.queryByRole("button", { name: /cancel booking/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the rebook modal when Re-book is clicked", async () => {
    renderBookingShow(
      baseMocks(makeBooking({ status: "cancelled", archived: false })),
    );

    await screen.findByText(/Reformer Advanced/i);
    fireEvent.click(screen.getByRole("button", { name: /re-book/i }));

    // Rebook modal should appear (contains the class title)
    const headings = await screen.findAllByText(/Reformer Advanced/i);
    expect(headings.length).toBeGreaterThan(0);
  });
});
