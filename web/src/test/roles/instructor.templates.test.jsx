import React from "react";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";

import { setMockAuth } from "../mocks/baseMocks";
import { instructorUser } from "../helpers/users";
import { studioSettingsMock, currentUserMock } from "../helpers/apolloMocks";

let App;

beforeAll(async () => {
  App = (await import("../../App.jsx")).default;
});

beforeEach(() => {
  setMockAuth({
    user: instructorUser({
      id: "inst-1",
      name: "Ingrid Instructor",
      email: "ingrid@example.com",
    }),
  });
});

describe("Instructor Templates workflows", () => {
  it("redirects instructors away from /templates (restricted per role matrix)", async () => {
    window.history.pushState({}, "Test", "/templates");

    const user = instructorUser({
      id: "inst-1",
      name: "Ingrid Instructor",
      email: "ingrid@example.com",
    });

    const mocks = [studioSettingsMock(), currentUserMock(user)];

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    );

    // Sidebar renders immediately; wait for a nav link to confirm AppShell is up
    await screen.findAllByRole("link", { name: "Dashboard" });

    // Instructors should NOT see the Templates/Classes page heading
    expect(
      screen.queryByRole("heading", { name: "Classes" }),
    ).not.toBeInTheDocument();
  });

  it("does not show Classes link in instructor sidebar", async () => {
    window.history.pushState({}, "Test", "/dashboard");

    const user = instructorUser({
      id: "inst-1",
      name: "Ingrid Instructor",
      email: "ingrid@example.com",
    });

    const mocks = [studioSettingsMock(), currentUserMock(user)];

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    );

    // Wait for the sidebar navigation to render (use getAllByRole for multiple links)
    await screen.findAllByRole("link", { name: "Dashboard" });

    // Instructors should not see the Classes (Templates) link in the sidebar
    expect(
      screen.queryByRole("link", { name: "Classes" }),
    ).not.toBeInTheDocument();
    // Instructors should not see the Clients link either
    expect(
      screen.queryByRole("link", { name: "Clients" }),
    ).not.toBeInTheDocument();
  });
});
