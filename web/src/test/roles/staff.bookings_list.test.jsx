import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { setMockAuth } from "../mocks/baseMocks";
import { staffUser } from "../helpers/users";
import { BOOKINGS } from "../../apollo/queries";
import BookingsPage from "../../pages/shared/Bookings.jsx";

vi.mock("../../studio/StudioProvider", () => ({
  useStudio: () => ({
    selectedStudioId: null,
    setSelectedStudioId: vi.fn(),
    studios: [],
    loading: false,
  }),
  StudioProvider: ({ children }) => children,
}));

const bookingsMock = {
  request: { query: BOOKINGS, variables: { studioLocationId: null } },
  result: {
    data: {
      bookings: [
        {
          __typename: "Booking",
          id: "b-10",
          studioId: "studio-1",
          slug: "b10",
          status: "booked",
          paid: false,
          priceCents: 5000,
          archived: false,
          createdAt: new Date().toISOString(),
          payment: null,
          bundlePurchase: null,
          client: {
            __typename: "Client",
            id: "c-10",
            name: "Casey Client",
            email: "casey@example.com",
          },
          classSession: {
            __typename: "ClassSession",
            id: "sess-10",
            startTime: new Date(Date.now() + 86400000 * 2).toISOString(),
            room: "Studio 1",
            classTemplate: {
              __typename: "ClassTemplate",
              id: "tmpl-10",
              title: "Evening Reformer",
              priceCents: 5000,
            },
            instructor: {
              __typename: "User",
              id: "inst-10",
              name: "Dana Instructor",
            },
          },
        },
      ],
    },
  },
};

describe("Staff bookings list page", () => {
  beforeEach(() => {
    setMockAuth({ user: staffUser() });
  });

  it("renders without crashing", () => {
    const { container } = render(
      <MockedProvider mocks={[bookingsMock]} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={["/bookings"]}>
          <Routes>
            <Route path="/bookings" element={<BookingsPage />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(container).toBeTruthy();
  });

  it("shows client name and class title", async () => {
    render(
      <MockedProvider mocks={[bookingsMock]} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={["/bookings"]}>
          <Routes>
            <Route path="/bookings" element={<BookingsPage />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    );
    expect(await screen.findByText(/Casey Client/)).toBeInTheDocument();
    expect(screen.getByText("Evening Reformer")).toBeInTheDocument();
  });

  it("shows unpaid indicator for unpaid booking", async () => {
    render(
      <MockedProvider mocks={[bookingsMock]} cache={new InMemoryCache()}>
        <MemoryRouter initialEntries={["/bookings"]}>
          <Routes>
            <Route path="/bookings" element={<BookingsPage />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    );
    await screen.findByText(/Casey Client/);
    expect(screen.getAllByText(/unpaid/i).length).toBeGreaterThan(0);
  });
});
