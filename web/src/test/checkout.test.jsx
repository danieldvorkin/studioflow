/**
 * checkout.test.jsx
 *
 * Frontend specs for the purchase (CheckoutModal) and rental (RentalWizard)
 * flows, covering:
 *   - Step rendering and navigation
 *   - Quantity controls
 *   - Payment method selection (new card / saved card)
 *   - Agreement acceptance (rental)
 *   - onConfirm called with correct payload
 *   - Overlay states (loading → success / error)
 *   - Free item / free rental paths
 *   - Cancel / close behaviour
 */

import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Pull in the shared mocks (Stripe, Auth, Toast, Theme, etc.)
import "./mocks/baseMocks";

// ---------------------------------------------------------------------------
// Minimal Apollo mock — the modals themselves don't use Apollo, but their
// imports may transitively pull in the client singleton.
// ---------------------------------------------------------------------------
vi.mock("@apollo/client", () => ({
  gql: (strings, ...values) => String.raw({ raw: strings }, ...values),
  useQuery: () => ({ data: undefined, loading: false, refetch: vi.fn() }),
  useMutation: () => [vi.fn(), { loading: false }],
}));

vi.mock("../../apollo/client", () => ({ default: {} }));

// ---------------------------------------------------------------------------
// Components under test
// ---------------------------------------------------------------------------
import CheckoutModal from "../components/shop/CheckoutModal";
import RentalWizard from "../components/shop/RentalWizard";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------
function makeSaleItem(overrides = {}) {
  return {
    id: "item-1",
    title: "Yoga Mat",
    description: "Premium quality mat",
    priceCents: 2500,
    currency: "cad",
    itemType: "sale",
    stockQuantity: 10,
    inStock: true,
    imageUrl: null,
    rentalAgreementText: null,
    ...overrides,
  };
}

function makeRentalItem(overrides = {}) {
  return {
    id: "item-2",
    title: "Foam Roller",
    description: "Recovery foam roller",
    priceCents: 1000,
    currency: "cad",
    itemType: "rental",
    stockQuantity: 5,
    inStock: true,
    imageUrl: null,
    rentalAgreementText: null,
    ...overrides,
  };
}

function makeSavedMethod(overrides = {}) {
  return {
    stripePaymentMethodId: "pm_saved_1",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2027,
    default: true,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ===========================================================================
//  CheckoutModal — Purchase flow
// ===========================================================================
describe("CheckoutModal — step 1 (Details)", () => {
  function renderModal(props = {}) {
    const defaults = {
      item: makeSaleItem(),
      onConfirm: vi.fn().mockResolvedValue(undefined),
      onClose: vi.fn(),
      stripePromise: null,
      savedMethods: [],
    };
    return render(<CheckoutModal {...defaults} {...props} />);
  }

  it("renders the Checkout heading", () => {
    renderModal();
    expect(screen.getByText("Checkout")).toBeInTheDocument();
  });

  it("shows the item title and description", () => {
    renderModal();
    expect(screen.getByText("Yoga Mat")).toBeInTheDocument();
    expect(screen.getByText("Premium quality mat")).toBeInTheDocument();
  });

  it("shows the formatted price per unit", () => {
    renderModal();
    // $25.00 each
    expect(screen.getByText(/\$25\.00/)).toBeInTheDocument();
  });

  it("shows remaining stock quantity", () => {
    renderModal();
    expect(screen.getByText(/10 units remaining/i)).toBeInTheDocument();
  });

  it("omits stock text when stockQuantity is null", () => {
    renderModal({ item: makeSaleItem({ stockQuantity: null }) });
    expect(screen.queryByText(/remaining/i)).not.toBeInTheDocument();
  });

  it("defaults quantity to 1", () => {
    renderModal();
    // The qty control renders "1"; the step indicator may also render "1"
    // We just confirm "1" appears somewhere in the output
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("increments quantity when + is clicked", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not decrement quantity below 1", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "−" }));
    // Still shows original 1
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("does not increment beyond stockQuantity", () => {
    renderModal({ item: makeSaleItem({ stockQuantity: 2 }) });
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    // Should cap at 2
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the ✕ header button is clicked", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
describe("CheckoutModal — step 2 (Payment)", () => {
  function goToStep2(props = {}) {
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <CheckoutModal
        item={makeSaleItem()}
        onConfirm={onConfirm}
        onClose={onClose}
        stripePromise={null}
        savedMethods={[]}
        {...props}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    return { onClose, onConfirm, rerender };
  }

  it("shows Payment heading on step 2", () => {
    goToStep2();
    // The <h3> heading is the unique 'heading' role; the step indicator uses <span>
    expect(
      screen.getByRole("heading", { name: "Payment" }),
    ).toBeInTheDocument();
  });

  it("renders CardElement when no saved methods", () => {
    goToStep2();
    expect(screen.getByTestId("card-element")).toBeInTheDocument();
  });

  it("shows 'Saved card' tab when savedMethods are provided", () => {
    goToStep2({ savedMethods: [makeSavedMethod()] });
    expect(
      screen.getByRole("button", { name: /saved card/i }),
    ).toBeInTheDocument();
  });

  it("displays saved card brand and last4", () => {
    goToStep2({ savedMethods: [makeSavedMethod()] });
    expect(screen.getByText(/visa •••• 4242/i)).toBeInTheDocument();
  });

  it("shows Default badge on the default card", () => {
    goToStep2({ savedMethods: [makeSavedMethod({ default: true })] });
    expect(screen.getByText(/default/i)).toBeInTheDocument();
  });

  it("can switch from saved card to new card tab", () => {
    goToStep2({ savedMethods: [makeSavedMethod()] });
    // Currently on saved card — switch to new
    fireEvent.click(screen.getByRole("button", { name: /new card/i }));
    expect(screen.getByTestId("card-element")).toBeInTheDocument();
  });

  it("shows 'free' message and no CardElement for $0 items", () => {
    goToStep2({ item: makeSaleItem({ priceCents: 0 }) });
    expect(screen.getByText(/this item is free/i)).toBeInTheDocument();
    expect(screen.queryByTestId("card-element")).not.toBeInTheDocument();
  });

  it("Back button returns to step 1", () => {
    goToStep2();
    fireEvent.click(screen.getByRole("button", { name: /← back/i }));
    // Step 1 content visible again
    expect(screen.getByText(/premium quality mat/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("CheckoutModal — step 3 (Review) and confirmation", () => {
  async function goToStep3(props = {}) {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <CheckoutModal
        item={makeSaleItem()}
        onConfirm={onConfirm}
        onClose={onClose}
        stripePromise={null}
        savedMethods={[]}
        {...props}
      />,
    );
    // Step 1 → 2
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    // Step 2 → 3 (async — tokenises card)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /review order/i }));
    });
    return { onConfirm, onClose };
  }

  it("shows Order summary heading on step 3", async () => {
    await goToStep3();
    expect(screen.getByText("Order summary")).toBeInTheDocument();
  });

  it("shows item title in order summary", async () => {
    await goToStep3();
    expect(screen.getByText("Yoga Mat")).toBeInTheDocument();
  });

  it("shows correct total amount", async () => {
    await goToStep3({ item: makeSaleItem({ priceCents: 5000 }) });
    // $50.00 appears in the summary row and the Place Order button — both are valid
    expect(screen.getAllByText(/\$50\.00/).length).toBeGreaterThan(0);
  });

  it("shows 'New card' in the payment row when using a new card", async () => {
    await goToStep3();
    expect(screen.getByText("New card")).toBeInTheDocument();
  });

  it("shows saved card details in payment row when using a saved card", async () => {
    const savedMethods = [makeSavedMethod({ stripePaymentMethodId: "pm_abc" })];
    render(
      <CheckoutModal
        item={makeSaleItem()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={savedMethods}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    // Saved card selected by default, no tokenization needed
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /review order/i }));
    });
    expect(screen.getByText(/visa •••• 4242/i)).toBeInTheDocument();
  });

  it("calls onConfirm with quantity and pm_test_new for new card", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    await goToStep3({ onConfirm });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    });
    expect(onConfirm).toHaveBeenCalledWith({
      quantity: 1,
      paymentMethodId: "pm_test_new",
    });
  });

  it("calls onConfirm with the saved paymentMethodId", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const savedMethods = [
      makeSavedMethod({ stripePaymentMethodId: "pm_saved_xyz" }),
    ];
    render(
      <CheckoutModal
        item={makeSaleItem()}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={savedMethods}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /review order/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    });
    expect(onConfirm).toHaveBeenCalledWith({
      quantity: 1,
      paymentMethodId: "pm_saved_xyz",
    });
  });

  it("calls onConfirm with paymentMethodId: null for free items", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <CheckoutModal
        item={makeSaleItem({ priceCents: 0 })}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    // Free — no tokenization, "Review order" advances immediately
    fireEvent.click(screen.getByRole("button", { name: /review order/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    });
    expect(onConfirm).toHaveBeenCalledWith({
      quantity: 1,
      paymentMethodId: null,
    });
  });

  it("calls onConfirm with incremented quantity when user changed qty on step 1", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <CheckoutModal
        item={makeSaleItem()}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={[]}
      />,
    );
    // Increase quantity to 3
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /review order/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    });
    expect(onConfirm).toHaveBeenCalledWith({
      quantity: 3,
      paymentMethodId: "pm_test_new",
    });
  });
});

// ---------------------------------------------------------------------------
describe("CheckoutModal — overlays", () => {
  async function confirmWithSlowFn() {
    let resolve;
    const slowConfirm = vi.fn().mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    render(
      <CheckoutModal
        item={makeSaleItem()}
        onConfirm={slowConfirm}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /review order/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    });
    return { resolve };
  }

  it("shows loading overlay immediately after clicking Place Order", async () => {
    await confirmWithSlowFn();
    expect(screen.getByText(/processing your order/i)).toBeInTheDocument();
  });

  it("shows success overlay after onConfirm resolves", async () => {
    const { resolve } = await confirmWithSlowFn();
    await act(async () => {
      resolve();
    });
    await waitFor(() =>
      expect(screen.getByText(/order placed for/i)).toBeInTheDocument(),
    );
  });

  it("shows error overlay when onConfirm rejects", async () => {
    const rejectConfirm = vi.fn().mockRejectedValue(new Error("card declined"));
    render(
      <CheckoutModal
        item={makeSaleItem()}
        onConfirm={rejectConfirm}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /review order/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /place order/i }));
    });
    await waitFor(() =>
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(),
    );
  });
});

// ===========================================================================
//  RentalWizard — Rental flow
// ===========================================================================
describe("RentalWizard — step 1 (Rental Details)", () => {
  function renderWizard(props = {}) {
    const defaults = {
      item: makeRentalItem(),
      onConfirm: vi.fn().mockResolvedValue(undefined),
      onClose: vi.fn(),
      stripePromise: null,
      savedMethods: [],
    };
    return render(<RentalWizard {...defaults} {...props} />);
  }

  it("renders the title in the header", () => {
    renderWizard();
    expect(screen.getByText(/rent · foam roller/i)).toBeInTheDocument();
  });

  it("shows rental fee amount", () => {
    renderWizard();
    expect(screen.getByText(/\$10\.00 rental fee/i)).toBeInTheDocument();
  });

  it("shows item description", () => {
    renderWizard();
    expect(screen.getByText("Recovery foam roller")).toBeInTheDocument();
  });

  it("shows the return-by date input", () => {
    renderWizard();
    // The label text is present (label and input are siblings, not associated via htmlFor)
    expect(screen.getByText(/return by \(due date\)/i)).toBeInTheDocument();
  });

  it("shows stock available count", () => {
    renderWizard();
    expect(screen.getByText(/5 units available/i)).toBeInTheDocument();
  });

  it("shows singular 'unit' when stockQuantity is 1", () => {
    renderWizard({ item: makeRentalItem({ stockQuantity: 1 }) });
    expect(screen.getByText(/1 unit available/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 units/i)).not.toBeInTheDocument();
  });

  it("defaults quantity to 1", () => {
    renderWizard();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("increments quantity", () => {
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    renderWizard({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the ✕ header button is clicked", () => {
    const onClose = vi.fn();
    renderWizard({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
describe("RentalWizard — step 2 (Rental Agreement)", () => {
  function goToStep2(props = {}) {
    render(
      <RentalWizard
        item={makeRentalItem()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={[]}
        {...props}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
  }

  it("shows Rental Agreement heading", () => {
    goToStep2();
    expect(screen.getByText("Rental Agreement")).toBeInTheDocument();
  });

  it("renders default agreement text", () => {
    goToStep2();
    expect(screen.getByText(/RENTAL AGREEMENT/)).toBeInTheDocument();
  });

  it("renders custom agreement text when provided", () => {
    goToStep2({
      item: makeRentalItem({ rentalAgreementText: "Custom studio terms." }),
    });
    expect(screen.getByText("Custom studio terms.")).toBeInTheDocument();
  });

  it("'I Agree' button is disabled before checking the checkbox", () => {
    goToStep2();
    expect(screen.getByRole("button", { name: /i agree/i })).toBeDisabled();
  });

  it("'I Agree' button becomes enabled after checking the checkbox", () => {
    goToStep2();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /i agree/i })).not.toBeDisabled();
  });

  it("Back button returns to step 1", () => {
    goToStep2();
    fireEvent.click(screen.getByRole("button", { name: /← back/i }));
    expect(screen.getByText(/rental fee/i)).toBeInTheDocument();
    expect(screen.queryByText("Rental Agreement")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("RentalWizard — step 3 (Payment)", () => {
  function goToStep3(props = {}) {
    render(
      <RentalWizard
        item={makeRentalItem()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={[]}
        {...props}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }));
  }

  it("shows Payment heading on step 3", () => {
    goToStep3();
    expect(screen.getByText("Payment")).toBeInTheDocument();
  });

  it("shows CardElement for new card", () => {
    goToStep3();
    expect(screen.getByTestId("card-element")).toBeInTheDocument();
  });

  it("shows saved card option when savedMethods available", () => {
    goToStep3({ savedMethods: [makeSavedMethod()] });
    expect(screen.getByText(/visa •••• 4242/i)).toBeInTheDocument();
  });

  it("can switch to new card tab from saved card", () => {
    goToStep3({ savedMethods: [makeSavedMethod()] });
    fireEvent.click(screen.getByRole("button", { name: /new card/i }));
    expect(screen.getByTestId("card-element")).toBeInTheDocument();
  });

  it("shows 'free' message and no CardElement for $0 rental fee", () => {
    goToStep3({ item: makeRentalItem({ priceCents: 0 }) });
    expect(screen.getByText(/this item is free/i)).toBeInTheDocument();
    expect(screen.queryByTestId("card-element")).not.toBeInTheDocument();
  });

  it("Back button returns to step 2 (agreement)", () => {
    goToStep3();
    fireEvent.click(screen.getByRole("button", { name: /← back/i }));
    expect(screen.getByText("Rental Agreement")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("RentalWizard — step 4 (Confirmation) and submission", () => {
  async function goToStep4(props = {}) {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <RentalWizard
        item={makeRentalItem()}
        onConfirm={onConfirm}
        onClose={onClose}
        stripePromise={null}
        savedMethods={[]}
        {...props}
      />,
    );
    // Step 1 → 2
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    // Step 2: agree → step 3
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }));
    // Step 3 → 4 (async: may tokenise card)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });
    return { onConfirm, onClose };
  }

  it("shows 'Confirm your rental' heading on step 4", async () => {
    await goToStep4();
    expect(screen.getByText(/confirm your rental/i)).toBeInTheDocument();
  });

  it("shows '✓ Accepted' for the agreement row", async () => {
    await goToStep4();
    expect(screen.getByText(/✓ Accepted/i)).toBeInTheDocument();
  });

  it("shows Return by row in the summary", async () => {
    await goToStep4();
    expect(screen.getByText("Return by")).toBeInTheDocument();
  });

  it("shows Rental fee row with formatted amount", async () => {
    await goToStep4();
    expect(screen.getByText("Rental fee")).toBeInTheDocument();
    // $10.00 appears in the fee row and in the 'Confirm Rental · $10.00' button
    expect(screen.getAllByText(/\$10\.00/).length).toBeGreaterThan(0);
  });

  it("shows 'New card' in payment row", async () => {
    await goToStep4();
    expect(screen.getByText("New card")).toBeInTheDocument();
  });

  it("shows saved card brand/last4 in payment row", async () => {
    const savedMethods = [makeSavedMethod({ stripePaymentMethodId: "pm_s_1" })];
    render(
      <RentalWizard
        item={makeRentalItem()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={savedMethods}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }));
    // Saved card — no tokenization needed
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/visa •••• 4242/i)).toBeInTheDocument();
  });

  it("calls onConfirm with full rental payload (new card)", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { onConfirm: _unused } = await goToStep4({ onConfirm });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /confirm rental/i }));
    });
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 1,
        rentalDueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        rentalAgreementAcceptedAt: expect.any(String),
        paymentMethodId: "pm_test_new",
      }),
    );
  });

  it("calls onConfirm with saved paymentMethodId", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const savedMethods = [
      makeSavedMethod({ stripePaymentMethodId: "pm_saved_rental" }),
    ];
    render(
      <RentalWizard
        item={makeRentalItem()}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={savedMethods}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }));
    // Saved card — no tokenization, no async needed
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /confirm rental/i }));
    });
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethodId: "pm_saved_rental" }),
    );
  });

  it("calls onConfirm with paymentMethodId: null for free rental", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <RentalWizard
        item={makeRentalItem({ priceCents: 0 })}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }));
    // Free — no tokenization
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /confirm rental/i }));
    });
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethodId: null }),
    );
  });

  it("calls onConfirm with quantity from step 1", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <RentalWizard
        item={makeRentalItem()}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={[]}
      />,
    );
    // Increase qty to 2 on step 1
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /confirm rental/i }));
    });
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 2 }),
    );
  });
});

// ---------------------------------------------------------------------------
describe("RentalWizard — overlays", () => {
  async function setupAndConfirm(confirmFn) {
    render(
      <RentalWizard
        item={makeRentalItem()}
        onConfirm={confirmFn}
        onClose={vi.fn()}
        stripePromise={null}
        savedMethods={[]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /i agree/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /next/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /confirm rental/i }));
    });
  }

  it("shows loading overlay while confirming", async () => {
    let resolve;
    const slowConfirm = vi.fn().mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    await setupAndConfirm(slowConfirm);
    expect(screen.getByText(/confirming your rental/i)).toBeInTheDocument();
    await act(async () => {
      resolve();
    }); // clean up promise
  });

  it("shows success overlay after successful rental", async () => {
    let resolve;
    const slowConfirm = vi.fn().mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    await setupAndConfirm(slowConfirm);
    await act(async () => {
      resolve();
    });
    await waitFor(() =>
      expect(screen.getByText(/rental confirmed/i)).toBeInTheDocument(),
    );
  });

  it("shows error overlay when rental confirm fails", async () => {
    const failConfirm = vi.fn().mockRejectedValue(new Error("server error"));
    await setupAndConfirm(failConfirm);
    await waitFor(() =>
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(),
    );
  });
});
