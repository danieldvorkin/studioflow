import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter } from "react-router-dom";

import "../mocks/baseMocks";
import { setMockAuth } from "../mocks/baseMocks";
import {
  ownerUser,
  staffUser,
  clientUser,
  instructorUser,
} from "../helpers/users";
import { currentUserMock } from "../helpers/apolloMocks";

// Mock the complex InstructorPayoutsModule sub-component to keep tests focused
// on the page-level access control, not the module's own queries.
vi.mock("../../components/instructor/InstructorPayoutsModule", () => ({
  default: () =>
    React.createElement(
      "div",
      { "data-testid": "payouts-module" },
      "Payouts module",
    ),
}));

import InstructorPayoutsPage from "../../pages/owner/payouts/InstructorPayouts.jsx";

function renderPage(mocks) {
  return render(
    <MockedProvider mocks={mocks} cache={new InMemoryCache()}>
      <MemoryRouter initialEntries={["/owner/instructor-payouts"]}>
        <InstructorPayoutsPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(cleanup);

describe("Instructor Payouts page — role-based access", () => {
  describe("as owner", () => {
    beforeEach(() => {
      setMockAuth({ user: ownerUser() });
    });

    it("shows the Instructor payouts heading", async () => {
      renderPage([currentUserMock(ownerUser())]);
      expect(
        await screen.findByRole("heading", { name: "Instructor payouts" }),
      ).toBeInTheDocument();
    });

    it("renders the payouts module sub-component", async () => {
      renderPage([currentUserMock(ownerUser())]);
      await screen.findByRole("heading", { name: "Instructor payouts" });
      expect(screen.getByTestId("payouts-module")).toBeInTheDocument();
    });
  });

  describe("as staff", () => {
    beforeEach(() => {
      setMockAuth({ user: staffUser() });
    });

    it('shows "Owner access only" for staff users', async () => {
      renderPage([currentUserMock(staffUser())]);
      expect(
        await screen.findByRole("heading", { name: /owner access only/i }),
      ).toBeInTheDocument();
    });

    it("does not show the payouts module for staff", async () => {
      renderPage([currentUserMock(staffUser())]);
      await screen.findByRole("heading", { name: /owner access only/i });
      expect(screen.queryByTestId("payouts-module")).not.toBeInTheDocument();
    });
  });

  describe("as instructor", () => {
    beforeEach(() => {
      setMockAuth({ user: instructorUser() });
    });

    it('shows "Owner access only" for instructor users', async () => {
      renderPage([currentUserMock(instructorUser())]);
      expect(
        await screen.findByRole("heading", { name: /owner access only/i }),
      ).toBeInTheDocument();
    });
  });

  describe("as client", () => {
    beforeEach(() => {
      setMockAuth({ user: clientUser() });
    });

    it('shows "Owner access only" for client users', async () => {
      renderPage([currentUserMock(clientUser())]);
      expect(
        await screen.findByRole("heading", { name: /owner access only/i }),
      ).toBeInTheDocument();
    });
  });
});
