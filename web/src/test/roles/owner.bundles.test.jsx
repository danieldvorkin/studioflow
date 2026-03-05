import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { InMemoryCache } from "@apollo/client";
import { MemoryRouter } from "react-router-dom";

// ─── Module mocks ─────────────────────────────────────────────────────────────
vi.mock("../../currency/CurrencyProvider", () => ({
  useCurrency: () => ({
    currency: "cad",
    setCurrency: vi.fn(),
    isCAD: true,
    priceDisplay: (cadAmount, _usdAmount) => ({
      symbol: "$",
      amount: cadAmount,
      label: "CAD",
    }),
    formatPrice: (cents, _storedCurrency) => {
      if (typeof cents !== "number" || !Number.isFinite(cents)) return "—";
      return `CA$${(cents / 100).toFixed(2)}`;
    },
  }),
  CurrencyProvider: ({ children }) => children,
}));

vi.mock("../../components/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
  ToastProvider: ({ children }) => children,
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

vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      id: "u-owner",
      email: "owner@studio.com",
      name: "Studio Owner",
      role: 0,
      roleName: "owner",
      godmode: false,
      active: true,
      studioId: "studio-1",
    },
    loading: false,
    signOut: vi.fn(),
    isImpersonating: false,
    impersonator: null,
  }),
  AuthProvider: ({ children }) => children,
}));

// ─── Page import ──────────────────────────────────────────────────────────────
import BundlesPage from "../../pages/Bundles.jsx";
import {
  BUNDLE_PRODUCTS,
  CLASS_TEMPLATES,
  CURRENT_USER,
  INSTRUCTORS,
} from "../../apollo/queries.js";

// ─── Shared owner data ────────────────────────────────────────────────────────
const OWNER = {
  __typename: "User",
  id: "u-owner",
  email: "owner@studio.com",
  name: "Studio Owner",
  role: 0,
  roleName: "owner",
  godmode: false,
  active: true,
  studioId: "studio-1",
};

function makeBundleProduct(overrides = {}) {
  return {
    __typename: "BundleProduct",
    id: "bp-1",
    title: "10-Class Reformer Pack",
    description: "Great value for regular reformer goers.",
    active: true,
    creditsCount: 10,
    priceCents: 25_000,
    currency: "cad",
    classTemplate: {
      __typename: "ClassTemplate",
      id: "ct-1",
      title: "Reformer Flow",
    },
    instructor: null,
    ...overrides,
  };
}

// ─── Apollo mocks ─────────────────────────────────────────────────────────────
const currentUserMock = {
  request: { query: CURRENT_USER, variables: {} },
  result: { data: { currentUser: OWNER } },
};

const emptyBundlesMock = {
  request: { query: BUNDLE_PRODUCTS, variables: {} },
  result: { data: { bundleProducts: [] } },
};

const oneBundleMock = {
  request: { query: BUNDLE_PRODUCTS, variables: {} },
  result: { data: { bundleProducts: [makeBundleProduct()] } },
};

const emptyTemplatesMock = {
  request: { query: CLASS_TEMPLATES, variables: {} },
  result: { data: { classTemplates: [] } },
};

const oneTemplateMock = {
  request: { query: CLASS_TEMPLATES, variables: {} },
  result: {
    data: {
      classTemplates: [
        {
          __typename: "ClassTemplate",
          id: "ct-1",
          title: "Reformer Flow",
          description: null,
          capacity: 10,
          durationMinutes: 50,
          priceCents: 3500,
          currency: "cad",
          compensationType: null,
          instructorSplitPercent: null,
          instructorFlatRateCents: null,
          studioLocation: null,
          instructor: null,
        },
      ],
    },
  },
};

const emptyInstructorsMock = {
  request: { query: INSTRUCTORS, variables: {} },
  result: { data: { instructors: [] } },
};

// ─── Render helper ────────────────────────────────────────────────────────────
function renderPage(mocks = []) {
  return render(
    <MockedProvider mocks={mocks} addTypename cache={new InMemoryCache()}>
      <MemoryRouter initialEntries={["/owner/bundles"]}>
        <BundlesPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

afterEach(cleanup);

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("BundlesPage – smoke", () => {
  describe("page structure", () => {
    it("renders the Bundles heading", async () => {
      renderPage([
        currentUserMock,
        emptyBundlesMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText("Bundles");
      expect(screen.getByText("Bundles")).toBeTruthy();
    });

    it("renders the descriptive subtitle", async () => {
      renderPage([
        currentUserMock,
        emptyBundlesMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText(/packages of credits/i);
    });

    it("renders the Add bundle section", async () => {
      renderPage([
        currentUserMock,
        emptyBundlesMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText(/add bundle/i);
    });
  });

  describe("create form", () => {
    it("renders the Title input", async () => {
      renderPage([
        currentUserMock,
        emptyBundlesMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText(/add bundle/i);
      expect(screen.getByPlaceholderText(/10-class pack/i)).toBeTruthy();
    });

    it("renders number inputs for Credits and Price", async () => {
      renderPage([
        currentUserMock,
        emptyBundlesMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText(/add bundle/i);
      // Credits and Price are both type="number" spinbuttons
      expect(screen.getAllByRole("spinbutton").length).toBeGreaterThanOrEqual(
        2,
      );
      // Credits label is present in the form
      expect(screen.getByText("Credits")).toBeTruthy();
    });

    it("renders a Create submit button", async () => {
      renderPage([
        currentUserMock,
        emptyBundlesMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText(/add bundle/i);
      expect(screen.getByRole("button", { name: /^create$/i })).toBeTruthy();
    });

    it("renders the class-template dropdown", async () => {
      renderPage([
        currentUserMock,
        emptyBundlesMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText(/add bundle/i);
      expect(screen.getAllByText(/class template/i).length).toBeGreaterThan(0);
    });

    it("populates the class-template dropdown with fetched templates", async () => {
      renderPage([
        currentUserMock,
        emptyBundlesMock,
        oneTemplateMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText("Reformer Flow");
    });

    it("shows the currency selector defaulting to CAD", async () => {
      renderPage([
        currentUserMock,
        emptyBundlesMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText(/add bundle/i);
      const selects = screen.getAllByRole("combobox");
      const currencySelect = selects.find((s) =>
        Array.from(s.options).some((o) => o.value === "cad"),
      );
      expect(currencySelect).toBeTruthy();
      expect(currencySelect.value).toBe("cad");
    });
  });

  describe("bundle list", () => {
    it("shows empty state text when no bundles exist", async () => {
      renderPage([
        currentUserMock,
        emptyBundlesMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText(/no bundles/i);
    });

    it("renders a bundle card with title and price after load", async () => {
      renderPage([
        currentUserMock,
        oneBundleMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText("10-Class Reformer Pack");
      expect(screen.getByText("10-Class Reformer Pack")).toBeTruthy();
      // price: 25000 cents → $250.00
      expect(screen.getByText(/250/)).toBeTruthy();
    });

    it("shows credits count on the bundle card", async () => {
      renderPage([
        currentUserMock,
        oneBundleMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText("10-Class Reformer Pack");
      expect(screen.getAllByText(/10/).length).toBeGreaterThan(0);
    });

    it("shows active badge on an active bundle", async () => {
      renderPage([
        currentUserMock,
        oneBundleMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText("10-Class Reformer Pack");
      expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0);
    });

    it("shows the linked class template name on the bundle card", async () => {
      renderPage([
        currentUserMock,
        oneBundleMock,
        emptyTemplatesMock,
        emptyInstructorsMock,
      ]);
      await screen.findByText("10-Class Reformer Pack");
      expect(screen.getByText(/reformer flow/i)).toBeTruthy();
    });
  });
});
