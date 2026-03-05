import React from "react";
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";

import { setMockAuth } from "../mocks/baseMocks";
import { instructorUser } from "../helpers/users";
import { studioSettingsMock, currentUserMock } from "../helpers/apolloMocks";

vi.mock("../../studio/StudioProvider", () => ({
  useStudio: () => ({
    selectedStudioId: null,
    setSelectedStudioId: vi.fn(),
    studios: [],
    loading: false,
  }),
  StudioProvider: ({ children }) => children,
}));

let App;

beforeAll(async () => {
  App = (await import("../../App.jsx")).default;
});

beforeEach(() => {
  setMockAuth({ user: instructorUser() });
});

describe("Instructor role navigation", () => {
  it("shows Bookings and Calendar links but not Owner section", async () => {
    // Navigate to /bookings – instructors can access this page
    window.history.pushState({}, "Test", "/bookings");

    const inst = instructorUser();
    const mocks = [studioSettingsMock(), currentUserMock(inst)];

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    );

    // Wait for AppShell sidebar to render
    await screen.findAllByRole("link", { name: "Dashboard" });

    // Instructor should see core nav items
    expect(screen.getByRole("link", { name: "Bookings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Calendar" })).toBeInTheDocument();

    // Instructor should NOT see Owner section
    expect(
      screen.queryByRole("link", { name: "Owner" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Locations" }),
    ).not.toBeInTheDocument();
    // canManageStudio is false for instructors – no Clients link
    expect(
      screen.queryByRole("link", { name: "Clients" }),
    ).not.toBeInTheDocument();
  });

  it("cannot view the Classes page - redirected away from /templates", async () => {
    // Instructors are redirected from /templates (canManageStudio = false)
    window.history.pushState({}, "Test", "/templates");

    const mocks = [studioSettingsMock(), currentUserMock(instructorUser())];

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    );

    // Sidebar still renders after redirect
    await screen.findAllByRole("link", { name: "Dashboard" });

    // The Classes heading must NOT appear (instructor was redirected away)
    expect(
      screen.queryByRole("heading", { name: "Classes" }),
    ).not.toBeInTheDocument();
  });
});
