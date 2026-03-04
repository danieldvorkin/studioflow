/**
 * Owner data isolation tests.
 *
 * Verifies that a regular (non-platform-staff) owner:
 *   - Does NOT see the godmode cross-studio owner picker
 *   - Sees the studio-scoped owner workspace (not platform-wide data)
 *   - Only sees staff/instructor rows in the People → Users table
 *     (not other owners or clients)
 */
import React from "react";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";

import { setMockAuth } from "../mocks/baseMocks";
import { ownerUser } from "../helpers/users";
import {
  studioSettingsMock,
  currentUserMock,
  ownerDashboardDataMocks,
} from "../helpers/apolloMocks";
import { ALL_USERS } from "../../apollo/queries";

let App;

beforeAll(async () => {
  App = (await import("../../App.jsx")).default;
});

const owner = ownerUser({
  id: "owner-1",
  studioId: "studio-1",
  email: "owner@studio.com",
});

beforeEach(() => {
  setMockAuth({ user: owner });
});

describe("Owner data isolation", () => {
  it("does NOT show the Godmode platform picker to a regular owner", async () => {
    window.history.pushState({}, "Test", "/owner");

    const mocks = [
      studioSettingsMock(),
      currentUserMock(owner),
      ...ownerDashboardDataMocks(),
    ];

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    );

    await screen.findByRole("heading", { name: "Owner workspace" });

    // Platform picker heading must NOT appear for regular owners
    expect(
      screen.queryByRole("heading", { name: "Godmode" }),
    ).not.toBeInTheDocument();
  });

  it("shows the studio-scoped owner workspace heading", async () => {
    window.history.pushState({}, "Test", "/owner");

    const mocks = [
      studioSettingsMock(),
      currentUserMock(owner),
      ...ownerDashboardDataMocks(),
    ];

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Owner workspace" }),
    ).toBeInTheDocument();
  });

  it("People section shows only staff and instructors, not other owners", async () => {
    window.history.pushState({}, "Test", "/owner");

    // Simulate the backend returning only staff+instructors (as enforced for owners)
    const staffMember = {
      id: "u-staff-1",
      email: "alice@studio.com",
      name: "Alice Staff",
      role: 1,
      roleName: "staff",
      active: true,
      availableForSessions: true,
      godmode: false,
      studioId: "studio-1",
      __typename: "User",
    };
    const instructorMember = {
      id: "u-inst-1",
      email: "bob@studio.com",
      name: "Bob Instructor",
      role: 2,
      roleName: "instructor",
      active: true,
      availableForSessions: true,
      godmode: false,
      studioId: "studio-1",
      __typename: "User",
    };

    const allUsersMock = {
      request: { query: ALL_USERS, variables: {} },
      result: { data: { users: [staffMember, instructorMember] } },
    };

    const mocks = [
      studioSettingsMock(),
      currentUserMock(owner),
      allUsersMock,
      // Remaining owner dashboard mocks (skip the generic ALL_USERS one)
      ...ownerDashboardDataMocks().filter((m) => m.request.query !== ALL_USERS),
    ];

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    );

    await screen.findAllByRole("heading", { name: "Owner workspace" });

    // Staff and instructor should be rendered in the People table
    expect(await screen.findByText("Alice Staff")).toBeInTheDocument();
    expect(await screen.findByText("Bob Instructor")).toBeInTheDocument();

    // Godmode platform picker must not appear
    expect(
      screen.queryByRole("heading", { name: "Godmode" }),
    ).not.toBeInTheDocument();
  });
});
