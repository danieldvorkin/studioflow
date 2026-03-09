import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { setMockAuth } from "../mocks/baseMocks";
import { clientUser } from "../helpers/users";
import { MY_BOOKINGS } from "../../apollo/queries";
import BookingsPage from "../../pages/shared/Bookings.jsx";

vi.mock("../../studio/StudioProvider", () => ({
  useStudio: () => ({
    selectedStudioId: "studio-1",
    setSelectedStudioId: vi.fn(),
    studios: [{ id: "studio-1", name: "Test Studio" }],
    loading: false,
  }),
  StudioProvider: ({ children }) => children,
}));

const upcomingBooking = {
  __typename: "Booking",
  id: "b-1",
  studioId: "studio-1",
  slug: "abc12345",
  status: "booked",
  paid: true,
  priceCents: 2000,
  archived: false,
  createdAt: new Date().toISOString(),
  payment: {
    __typename: "Payment",
    id: "p-1",
    status: "succeeded",
    amountCents: 2000,
    currency: "cad",
    errorMessage: null,
    createdAt: new Date().toISOString(),
  },
  bundlePurchase: null,
  client: {
    __typename: "Client",
    id: "c-1",
    name: "Sam Client",
    email: "sam@example.com",
  },
  classSession: {
    __typename: "ClassSession",
    id: "sess-1",
    startTime: new Date(Date.now() + 86400000).toISOString(),
    room: "Room A",
    classTemplate: {
      __typename: "ClassTemplate",
      id: "tmpl-1",
      title: "Morning Pilates",
      priceCents: 2000,
    },
    instructor: { __typename: "User", id: "inst-1", name: "Jane Instructor" },
  },
};

const myBookingsMock = {
  request: {
    query: MY_BOOKINGS,
    variables: { studioLocationId: null, studioId: "studio-1" },
  },
  result: { data: { myBookings: [upcomingBooking] } },
};

describe("Client my-bookings page", () => {
  beforeEach(() => {
    setMockAuth({
      user: clientUser({ id: "client-user-1", name: "Sam Client" }),
    });
  });

  it("renders without crashing", () => {
    const { container } = render(
      <MockedProvider mocks={[myBookingsMock]} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={["/bookings"]}>
          <Routes>
            <Route path="/bookings" element={<BookingsPage />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(container).toBeTruthy();
  });

  it("shows class title after data loads", async () => {
    render(
      <MockedProvider mocks={[myBookingsMock]} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={["/bookings"]}>
          <Routes>
            <Route path="/bookings" element={<BookingsPage />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(await screen.findByText("Morning Pilates")).toBeInTheDocument();
  });

  it("shows the booking status", async () => {
    render(
      <MockedProvider mocks={[myBookingsMock]} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={["/bookings"]}>
          <Routes>
            <Route path="/bookings" element={<BookingsPage />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    );
    await screen.findByText("Morning Pilates");
    // booked status badge
    expect(screen.getAllByText(/booked/i).length).toBeGreaterThan(0);
  });
});
