import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const addToast = vi.fn();
vi.mock("../../components/shared/ToastProvider", () => ({
  useToast: () => ({ addToast }),
  ToastProvider: ({ children }) => children,
}));

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "owner@example.com",
      name: "Owner",
      role: 0,
      roleName: "owner",
      godmode: false,
      active: true,
      studioId: "studio-1",
    },
    loading: false,
    signOut: vi.fn(),
    isImpersonating: false,
  }),
  AuthProvider: ({ children }) => children,
}));

import SessionManage from "../../pages/owner/classes/SessionManage.jsx";
import { SESSION_BOOKINGS } from "../../apollo/queries.js";
import {
  CANCEL_BOOKING,
  MARK_NO_SHOW_BOOKING,
  SEND_BOOKING_PAYMENT_REMINDER,
} from "../../apollo/mutations.js";

const SESSION_ID = "sess-1";

function makeBooking(overrides = {}) {
  return {
    __typename: "Booking",
    id: "b-1",
    studioId: "studio-1",
    slug: "abc123",
    status: "booked",
    paid: false,
    priceCents: 2000,
    archived: false,
    createdAt: new Date("2026-03-01T10:00:00Z").toISOString(),
    payment: null,
    client: {
      __typename: "Client",
      id: "c-1",
      name: "Jane Doe",
      email: "jane@example.com",
    },
    classSession: {
      __typename: "ClassSession",
      id: SESSION_ID,
      startTime: new Date("2026-03-10T10:00:00Z").toISOString(),
      endTime: new Date("2026-03-10T11:00:00Z").toISOString(),
      capacity: 10,
      room: "Studio A",
      instructor: { __typename: "User", id: "inst-1", name: "Instructor" },
      classTemplate: {
        __typename: "ClassTemplate",
        id: "t-1",
        title: "Yoga Flow",
        priceCents: 2000,
        currency: "cad",
      },
    },
    ...overrides,
  };
}

function sessionBookingsMock(bookings = []) {
  return {
    request: {
      query: SESSION_BOOKINGS,
      variables: { classSessionId: SESSION_ID },
    },
    result: {
      data: {
        bookings: bookings,
      },
    },
  };
}

function renderSessionManage(mocks = []) {
  return render(
    <MockedProvider mocks={mocks} addTypename cache={new InMemoryCache()}>
      <MemoryRouter initialEntries={[`/sessions/${SESSION_ID}/manage`]}>
        <Routes>
          <Route path="/sessions/:id/manage" element={<SessionManage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe("SessionManage — owner/staff session detail panel", () => {
  beforeEach(() => {
    addToast.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows aggregate stats and roster for a session", async () => {
    const booking = makeBooking();
    renderSessionManage([sessionBookingsMock([booking])]);

    expect(await screen.findByText("Yoga Flow")).toBeInTheDocument();
    expect(screen.getByText(/Confirmed \/ Capacity/i)).toBeInTheDocument();
    expect(screen.getByText(/Revenue collected/i)).toBeInTheDocument();
    expect(screen.getByText(/Outstanding balance/i)).toBeInTheDocument();

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("#abc123")).toBeInTheDocument();
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
    expect(screen.getByText("Booked")).toBeInTheDocument();
  });

  it("shows Cancel button and calls cancelBooking mutation", async () => {
    const booking = makeBooking();

    const mocks = [
      sessionBookingsMock([booking]),
      {
        request: { query: CANCEL_BOOKING, variables: { id: "b-1" } },
        result: { data: { cancelBooking: { success: true, errors: [] } } },
      },
      sessionBookingsMock([]),
    ];

    renderSessionManage(mocks);
    await screen.findByText("Jane Doe");

    // Cancel action button is inside the roster row (distinct from "Cancelled" filter tab)
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);

    await waitFor(() => expect(addToast).toHaveBeenCalled());
    const messages = addToast.mock.calls
      .map((c) => c?.[0]?.message)
      .filter(Boolean);
    expect(messages.join(" ")).toMatch(/cancelled/i);
  });

  it("shows No-Show button and calls markNoShowBooking mutation", async () => {
    const booking = makeBooking();

    const mocks = [
      sessionBookingsMock([booking]),
      {
        request: { query: MARK_NO_SHOW_BOOKING, variables: { id: "b-1" } },
        result: { data: { markNoShowBooking: { success: true, errors: [] } } },
      },
      sessionBookingsMock([]),
    ];

    renderSessionManage(mocks);
    await screen.findByText("Jane Doe");

    const noShowBtn = screen.getByRole("button", { name: "No-Show" });
    fireEvent.click(noShowBtn);

    await waitFor(() => expect(addToast).toHaveBeenCalled());
    const messages = addToast.mock.calls
      .map((c) => c?.[0]?.message)
      .filter(Boolean);
    expect(messages.join(" ")).toMatch(/no-show/i);
  });

  it("shows Send reminder button for unpaid booked bookings and calls mutation", async () => {
    const booking = makeBooking({ paid: false, status: "booked" });

    const mocks = [
      sessionBookingsMock([booking]),
      {
        request: {
          query: SEND_BOOKING_PAYMENT_REMINDER,
          variables: { bookingId: "b-1" },
        },
        result: {
          data: {
            sendBookingPaymentReminder: {
              success: true,
              checkoutUrl: "https://stripe.test/checkout",
              errors: [],
            },
          },
        },
      },
    ];

    renderSessionManage(mocks);
    await screen.findByText("Jane Doe");

    const reminderBtn = screen.getByRole("button", { name: "Send reminder" });
    fireEvent.click(reminderBtn);

    await waitFor(() => expect(addToast).toHaveBeenCalled());
    const messages = addToast.mock.calls
      .map((c) => c?.[0]?.message)
      .filter(Boolean);
    expect(messages.join(" ")).toMatch(/reminder sent/i);
  });

  it("filters roster by status", async () => {
    const booked = makeBooking({ id: "b-1", status: "booked" });
    const cancelled = makeBooking({
      id: "b-2",
      status: "cancelled",
      slug: "def456",
      client: {
        __typename: "Client",
        id: "c-2",
        name: "John Smith",
        email: "john@example.com",
      },
    });

    renderSessionManage([sessionBookingsMock([booked, cancelled])]);
    await screen.findByText("Jane Doe");
    expect(screen.getByText("John Smith")).toBeInTheDocument();

    // Click the "Cancelled (1)" filter button
    const cancelledFilterBtns = screen.getAllByRole("button", {
      name: /Cancelled/,
    });
    // The filter tab contains the count "(1)", so pick the one that matches exactly
    const cancelledFilterBtn = cancelledFilterBtns.find((b) =>
      b.textContent.includes("("),
    );
    fireEvent.click(cancelledFilterBtn);

    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    expect(screen.getByText("John Smith")).toBeInTheDocument();
  });

  it("does not show reminder or no-show buttons for paid bookings", async () => {
    const paid = makeBooking({ paid: true, status: "booked" });
    renderSessionManage([sessionBookingsMock([paid])]);
    await screen.findByText("Jane Doe");

    expect(
      screen.queryByRole("button", { name: "Send reminder" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No-Show" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Send reminder" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No-Show" })).toBeInTheDocument();
  });
});
