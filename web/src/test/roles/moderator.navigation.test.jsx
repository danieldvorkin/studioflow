import React from "react";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { gql } from "@apollo/client";

import { setMockAuth } from "../mocks/baseMocks";
import { moderatorUser } from "../helpers/users";
import {
  studioSettingsMock,
  classTemplatesMock,
  instructorsMock,
  currentUserMock,
} from "../helpers/apolloMocks";
import { ALL_USERS } from "../../apollo/queries";

const STUDIOS = gql`
  query Studios {
    studios {
      id
      name
      studioLocations {
        id
        name
      }
    }
  }
`;

let App;

beforeAll(async () => {
  App = (await import("../../App.jsx")).default;
});

beforeEach(() => {
  setMockAuth({ user: moderatorUser() });
});

describe("Moderator role navigation", () => {
  it("shows Owner section links in sidebar (moderators oversee entire platform)", async () => {
    window.history.pushState({}, "Test", "/templates");

    const mocks = [
      studioSettingsMock(),
      classTemplatesMock({ templates: [], studioLocationId: null }),
      instructorsMock([]),
    ];

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    );

    await screen.findByRole("heading", { name: "Classes" });

    expect(screen.getByRole("link", { name: "Owner" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Instructor payouts" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Locations" })).toBeInTheDocument();
  });

  it("shows Classes and Clients links in sidebar", async () => {
    window.history.pushState({}, "Test", "/templates");

    const mocks = [
      studioSettingsMock(),
      classTemplatesMock({ templates: [], studioLocationId: null }),
      instructorsMock([]),
    ];

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    );

    await screen.findByRole("heading", { name: "Classes" });

    expect(
      screen.getAllByRole("link", { name: "Classes" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Clients" }).length,
    ).toBeGreaterThan(0);
  });

  it("shows platform owner picker on /owner (not regular owner dashboard)", async () => {
    window.history.pushState({}, "Test", "/owner");

    const mod = moderatorUser({
      id: "mod-1",
      name: "Maxine Moderator",
      email: "max@example.com",
    });

    const allUsersMock = {
      request: { query: ALL_USERS, variables: {} },
      result: { data: { users: [] } },
    };

    const studiosMock = {
      request: { query: STUDIOS, variables: {} },
      result: { data: { studios: [] } },
    };

    const mocks = [
      studioSettingsMock(),
      currentUserMock(mod),
      allUsersMock,
      studiosMock,
    ];

    render(
      <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
        <App />
      </MockedProvider>,
    );

    // Moderators should see "Godmode" heading (platform picker), not regular owner page
    expect(
      await screen.findByRole("heading", { name: "Godmode" }),
    ).toBeInTheDocument();
  });
});
