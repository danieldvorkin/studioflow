import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ─── Mocks ────────────────────────────────────────────────────────────────────
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
      id: "u-client",
      email: "client@example.com",
      name: "Client User",
      role: 3,
      roleName: "client",
      godmode: false,
      active: true,
    },
    loading: false,
    signOut: vi.fn(),
    isImpersonating: false,
  }),
  AuthProvider: ({ children }) => children,
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

vi.mock("../../location/LocationProvider", () => ({
  useLocationContext: () => ({
    locations: [],
    locationId: null,
    setLocationId: vi.fn(),
  }),
  LocationProvider: ({ children }) => children,
}));

vi.mock("../../studio/StudioProvider", () => ({
  useStudio: () => ({
    selectedStudioId: "studio-1",
    setSelectedStudioId: vi.fn(),
    studios: [{ id: "studio-1", name: "Demo Studio" }],
    loading: false,
  }),
  StudioProvider: ({ children }) => children,
}));

// ─── Lazy import after mocks ──────────────────────────────────────────────────
import BookingShow from "../../pages/shared/BookingShow.jsx";
import {
  CURRENT_USER,
  MY_BOOKINGS,
  PAYMENT_PUBLIC_SETTINGS,
  MY_CLIENT,
} from "../../apollo/queries.js";
import { REBOOK_BOOKING_WITH_PAYMENT } from "../../apollo/mutations.js";

// ─── Test data ────────────────────────────────────────────────────────────────
const STUDIO_ID = "studio-1";
const BOOKING_ID = "b-cancelled-1";

function makeBooking(overrides = {}) {
  return {
    __typename: "Booking",
    id: BOOKING_ID,
    studioId: STUDIO_ID,
    slug: null,
    status: "cancelled",
    paid: false,
    priceCents: 3000,
    archived: false,
    createdAt: new Date("2026-03-01T09:00:00Z").toISOString(),
    payment: null,
    bundlePurchase: null,
    client: {
      __typename: "Client",
      id: "c-1",
      name: "Client User",
      email: "client@example.com",
      clientPaymentMethods: [],
    },
    classSession: {
      __typename: "ClassSession",
      id: "sess-1",
      startTime: new Date("2026-04-10T10:30:00Z").toISOString(),
      room: "A",
      instructor: { __typename: "User", id: "inst-1", name: "Alex" },
      classTemplate: {
        __typename: "ClassTemplate",
        id: "t-1",
        title: "Reformer Basics",
        priceCents: 3000,
        currency: "cad",
        durationMinutes: 50,
      },
    },
    ...overrides,
  };
}

const cancelledBooking = makeBooking();

const currentUserMock = {
  request: { query: CURRENT_USER, variables: {} },
  result: {
    data: {
      currentUser: {
        __typename: "User",
        id: "u-client",
        email: "client@example.com",
        name: "Client User",
        role: 3,
        roleName: "client",
        active: true,
        availableForSessions: false,
        studioId: "studio-a",
      },
    },
  },
};

const myBookingsMock = {
  request: { query: MY_BOOKINGS, variables: {} },
  result: { data: { myBookings: [cancelledBooking] } },
};

const paymentSettingsMock = {
  request: {
    query: PAYMENT_PUBLIC_SETTINGS,
    variables: { studioId: STUDIO_ID },
  },
  result: {
    data: {
      paymentPublicSettings: {
        __typename: "PaymentPublicSetting",
        stripePublishableKey: null,
        defaultCurrency: "cad",
        enabled: false,
        configured: false,
      },
    },
  },
};

const myClientMock = {
  request: { query: MY_CLIENT, variables: { studioId: STUDIO_ID } },
  result: {
    data: {
      myClient: {
        __typename: "Client",
        id: "c-1",
        name: "Client User",
        email: "client@example.com",
        stripeCustomerId: null,
        stripeDefaultPaymentMethodId: null,
        stripeDefaultPaymentMethodBrand: null,
        stripeDefaultPaymentMethodLast4: null,
        stripeDefaultPaymentMethodExpMonth: null,
        stripeDefaultPaymentMethodExpYear: null,
      },
    },
  },
};

function renderBookingShow(mocks) {
  return render(
    <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
      <MemoryRouter initialEntries={[`/bookings/${BOOKING_ID}`]}>
        <Routes>
          <Route path="/bookings/:id" element={<BookingShow />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("Client – cancelled booking: rebook flow", () => {
  beforeEach(() => {
    addToast.mockReset();
  });

  it("renders the booking page for a cancelled booking", async () => {
    renderBookingShow([
      currentUserMock,
      myBookingsMock,
      paymentSettingsMock,
      myClientMock,
    ]);
    const matches = await screen.findAllByText(/Reformer Basics/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("shows the Re-book button for a cancelled non-archived booking", async () => {
    renderBookingShow([
      currentUserMock,
      myBookingsMock,
      paymentSettingsMock,
      myClientMock,
    ]);
    await screen.findAllByText(/Reformer Basics/i);
    expect(
      screen.getByRole("button", { name: /re-book/i }),
    ).toBeInTheDocument();
  });

  it("does NOT show the Re-book button for a booked (active) booking", async () => {
    const bookedBooking = makeBooking({ status: "booked" });
    const bookedMocks = [
      currentUserMock,
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [bookedBooking] } },
      },
      paymentSettingsMock,
      myClientMock,
    ];
    renderBookingShow(bookedMocks);
    await screen.findAllByText(/Reformer Basics/i);
    expect(
      screen.queryByRole("button", { name: /re-book/i }),
    ).not.toBeInTheDocument();
  });

  it("does NOT show the Archive booking button for a client user", async () => {
    renderBookingShow([
      currentUserMock,
      myBookingsMock,
      paymentSettingsMock,
      myClientMock,
    ]);
    await screen.findAllByText(/Reformer Basics/i);
    expect(
      screen.queryByRole("button", { name: /archive booking/i }),
    ).not.toBeInTheDocument();
  });

  it("shows the Cancel booking button for a booked (active) booking", async () => {
    const bookedBooking = makeBooking({ status: "booked", paid: false });
    const bookedMocks = [
      currentUserMock,
      {
        request: { query: MY_BOOKINGS, variables: {} },
        result: { data: { myBookings: [bookedBooking] } },
      },
      paymentSettingsMock,
      myClientMock,
    ];
    renderBookingShow(bookedMocks);
    await screen.findAllByText(/Reformer Basics/i);
    expect(
      screen.getByRole("button", { name: /cancel booking/i }),
    ).toBeInTheDocument();
  });
});
