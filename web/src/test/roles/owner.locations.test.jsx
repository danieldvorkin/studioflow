import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter } from "react-router-dom";

import "../mocks/baseMocks";
import { setMockAuth } from "../mocks/baseMocks";
import { ownerUser, staffUser, clientUser } from "../helpers/users";
import { currentUserMock, studioLocationsMock } from "../helpers/apolloMocks";

import LocationsPage from "../../pages/Locations.jsx";

const mockLocations = [
  {
    id: "loc-1",
    name: "Downtown Studio",
    address: "123 Main St",
    city: "Toronto",
    state: "ON",
    zip: "M5V 1A1",
  },
  {
    id: "loc-2",
    name: "Uptown Studio",
    address: "456 Queen St",
    city: "Toronto",
    state: "ON",
    zip: "M4V 2Z3",
  },
];

function renderPage(user, extraMocks = []) {
  return render(
    <MockedProvider
      mocks={[currentUserMock(user), ...extraMocks]}
      cache={new InMemoryCache()}
    >
      <MemoryRouter initialEntries={["/locations"]}>
        <LocationsPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(cleanup);

describe("Locations page — owner access", () => {
  beforeEach(() => {
    setMockAuth({ user: ownerUser() });
  });

  it('shows the "Locations" heading for owner', async () => {
    renderPage(ownerUser(), [studioLocationsMock([])]);
    expect(
      await screen.findByRole("heading", { name: "Locations" }),
    ).toBeInTheDocument();
  });

  it('shows the "Add location" section for owner', async () => {
    renderPage(ownerUser(), [studioLocationsMock([])]);
    await screen.findByRole("heading", { name: "Locations" });
    expect(screen.getByText(/Add location/i)).toBeInTheDocument();
  });

  it("renders a Name input field in the create form", async () => {
    renderPage(ownerUser(), [studioLocationsMock([])]);
    await screen.findByRole("heading", { name: "Locations" });
    const nameInputs = screen.getAllByPlaceholderText(/Downtown/i);
    expect(nameInputs.length).toBeGreaterThan(0);
  });

  it("lists existing locations for owner", async () => {
    renderPage(ownerUser(), [studioLocationsMock(mockLocations)]);
    await screen.findByRole("heading", { name: "Locations" });
    expect(await screen.findByText("Downtown Studio")).toBeInTheDocument();
    expect(screen.getByText("Uptown Studio")).toBeInTheDocument();
  });
});

describe("Locations page — staff blocked", () => {
  beforeEach(() => {
    setMockAuth({ user: staffUser() });
  });

  it('shows "Owner access only" for staff', async () => {
    renderPage(staffUser());
    expect(
      await screen.findByRole("heading", { name: /owner access only/i }),
    ).toBeInTheDocument();
  });

  it("does not show the Add location form to staff", async () => {
    renderPage(staffUser());
    await screen.findByRole("heading", { name: /owner access only/i });
    expect(screen.queryByText(/Add location/i)).not.toBeInTheDocument();
  });
});

describe("Locations page — client blocked", () => {
  beforeEach(() => {
    setMockAuth({ user: clientUser() });
  });

  it('shows "Owner access only" for client', async () => {
    renderPage(clientUser());
    expect(
      await screen.findByRole("heading", { name: /owner access only/i }),
    ).toBeInTheDocument();
  });
});
