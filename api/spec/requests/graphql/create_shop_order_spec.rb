# frozen_string_literal: true

require "rails_helper"

RSpec.describe "createShopOrder mutation", type: :request do
  let(:studio) { create(:studio) }
  let(:owner)  { create(:user, :owner, studio: studio) }
  let(:client_user) { create(:user, :client, studio: studio) }

  # Payment-settings stub: configured Stripe for each example that needs it
  let(:payment_setting) do
    PaymentSetting.instance_for(studio).tap do |ps|
      ps.update!(
        stripe_publishable_key: "pk_test_stub",
        stripe_secret_key:      "sk_test_stub",
        enabled:                true
      )
    end
  end

  let(:stripe_intent_double) do
    double("Stripe::PaymentIntent", id: "pi_test_123", status: "succeeded")
  end

  # ── helpers ──────────────────────────────────────────────────────────────────

  def purchase_mutation
    <<~GRAPHQL
      mutation CreateShopOrder(
        $shopItemId: ID!
        $quantity: Int
        $paymentMethodId: String
        $clientId: ID
      ) {
        createShopOrder(input: {
          shopItemId: $shopItemId
          quantity: $quantity
          paymentMethodId: $paymentMethodId
          clientId: $clientId
        }) {
          shopOrder { id status totalCents stripePaymentIntentId shopItem { title } }
          errors
        }
      }
    GRAPHQL
  end

  def rental_mutation
    <<~GRAPHQL
      mutation CreateRentalOrder(
        $shopItemId: ID!
        $quantity: Int
        $paymentMethodId: String
        $rentalDueDate: ISO8601Date
        $rentalAgreementAcceptedAt: ISO8601DateTime
        $clientId: ID
      ) {
        createShopOrder(input: {
          shopItemId: $shopItemId
          quantity: $quantity
          paymentMethodId: $paymentMethodId
          rentalDueDate: $rentalDueDate
          rentalAgreementAcceptedAt: $rentalAgreementAcceptedAt
          clientId: $clientId
        }) {
          shopOrder { id status totalCents stripePaymentIntentId rentalDueDate shopItem { title } }
          errors
        }
      }
    GRAPHQL
  end

  def rental_vars(item, extra = {})
    {
      shopItemId: item.id.to_s,
      quantity:   1,
      rentalDueDate: (Date.today + 7).iso8601,
      rentalAgreementAcceptedAt: Time.current.iso8601
    }.merge(extra)
  end

  # ── purchase (sale item) ──────────────────────────────────────────────────────

  describe "purchasing a sale item" do
    context "as an owner placing an order on behalf of a client (no Stripe)" do
      let(:item)   { create(:shop_item, studio: studio, price_cents: 3500, item_type: "sale") }
      let(:client) { create(:client, studio: studio) }

      it "creates a pending order without Stripe" do
        sign_in(owner)
        json = graphql_post(
          query: purchase_mutation,
          variables: { shopItemId: item.id.to_s, quantity: 1, clientId: client.id.to_s }
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["errors"]).to be_empty
        expect(payload.dig("shopOrder", "status")).to eq("pending")
        expect(payload.dig("shopOrder", "totalCents")).to eq(3500)
        expect(payload.dig("shopOrder", "stripePaymentIntentId")).to be_nil
      end

      it "decrements stock when an order is placed" do
        item = create(:shop_item, :limited_stock, studio: studio, stock_quantity: 5, price_cents: 500)
        sign_in(owner)
        graphql_post(
          query: purchase_mutation,
          variables: { shopItemId: item.id.to_s, quantity: 2, clientId: client.id.to_s }
        )

        expect(item.reload.stock_quantity).to eq(3)
      end
    end

    context "as a client (Stripe charge required)" do
      let(:item) { create(:shop_item, studio: studio, price_cents: 4000, item_type: "sale") }

      before do
        payment_setting  # ensure configured
        create(:client, studio: studio, user: client_user, stripe_customer_id: "cus_test")
        allow(Stripe::PaymentIntent).to receive(:create).and_return(stripe_intent_double)
      end

      it "creates a paid order when Stripe succeeds" do
        sign_in(client_user)
        json = graphql_post(
          query: purchase_mutation,
          variables: { shopItemId: item.id.to_s, quantity: 1, paymentMethodId: "pm_test_valid" }
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["errors"]).to be_empty
        expect(payload.dig("shopOrder", "status")).to eq("paid")
        expect(payload.dig("shopOrder", "stripePaymentIntentId")).to eq("pi_test_123")
      end

      it "passes the customer ID to Stripe" do
        sign_in(client_user)
        graphql_post(
          query: purchase_mutation,
          variables: { shopItemId: item.id.to_s, quantity: 1, paymentMethodId: "pm_test_valid" }
        )

        expect(Stripe::PaymentIntent).to have_received(:create).with(
          hash_including(customer: "cus_test")
        )
      end

      it "does NOT pass customer to Stripe when client has no stripe_customer_id" do
        # Use a fresh user with no stripe_customer_id
        fresh_user = create(:user, :client, studio: studio)
        create(:client, studio: studio, user: fresh_user)  # no stripe_customer_id

        sign_in(fresh_user)
        graphql_post(
          query: purchase_mutation,
          variables: { shopItemId: item.id.to_s, quantity: 1, paymentMethodId: "pm_test_valid" }
        )

        expect(Stripe::PaymentIntent).to have_received(:create).with(
          hash_excluding(:customer)
        )
      end

      it "rolls back stock and destroys the order when Stripe raises CardError" do
        item = create(:shop_item, :limited_stock, studio: studio, stock_quantity: 3, price_cents: 1000)
        allow(Stripe::PaymentIntent).to receive(:create)
          .and_raise(Stripe::CardError.new("Your card was declined.", nil, code: "card_declined"))

        sign_in(client_user)
        json = graphql_post(
          query: purchase_mutation,
          variables: { shopItemId: item.id.to_s, quantity: 1, paymentMethodId: "pm_declined" }
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["shopOrder"]).to be_nil
        expect(payload["errors"].first).to match(/card was declined/i)
        expect(item.reload.stock_quantity).to eq(3)   # restored
        expect(ShopOrder.count).to eq(0)              # rolled back
      end

      it "rolls back stock and destroys the order when Stripe raises StripeError" do
        item = create(:shop_item, :limited_stock, studio: studio, stock_quantity: 2, price_cents: 1000)
        allow(Stripe::PaymentIntent).to receive(:create)
          .and_raise(Stripe::StripeError.new("Network error"))

        sign_in(client_user)
        json = graphql_post(
          query: purchase_mutation,
          variables: { shopItemId: item.id.to_s, quantity: 1, paymentMethodId: "pm_bad" }
        )

        expect(item.reload.stock_quantity).to eq(2)
        expect(ShopOrder.count).to eq(0)
      end

      it "returns an error when payment_method_id is missing" do
        sign_in(client_user)
        json = graphql_post(
          query: purchase_mutation,
          variables: { shopItemId: item.id.to_s, quantity: 1 }
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["shopOrder"]).to be_nil
        expect(payload["errors"].first).to match(/payment method is required/i)
      end

      it "returns an error when Stripe is not configured for the studio" do
        PaymentSetting.instance_for(studio).update!(enabled: false)
        sign_in(client_user)
        json = graphql_post(
          query: purchase_mutation,
          variables: { shopItemId: item.id.to_s, quantity: 1, paymentMethodId: "pm_test" }
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["shopOrder"]).to be_nil
        expect(payload["errors"].first).to match(/stripe is not configured/i)
      end

      it "completes the order even when the confirmation email fails to enqueue" do
        allow(ShopOrderMailer).to receive_message_chain(:with, :order_confirmation, :deliver_later)
          .and_raise(StandardError, "Redis connection refused")

        sign_in(client_user)
        json = graphql_post(
          query: purchase_mutation,
          variables: { shopItemId: item.id.to_s, quantity: 1, paymentMethodId: "pm_test_valid" }
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["errors"]).to be_empty
        expect(payload.dig("shopOrder", "status")).to eq("paid")
      end
    end
  end

  # ── rental ────────────────────────────────────────────────────────────────────

  describe "renting an item" do
    let(:item) do
      create(:shop_item, :rental, studio: studio, price_cents: 1500, stock_quantity: 2)
    end

    context "as an owner placing a rental for a client (no Stripe)" do
      let(:client) { create(:client, studio: studio) }

      it "creates a pending rental order with a due date" do
        sign_in(owner)
        json = graphql_post(
          query: rental_mutation,
          variables: rental_vars(item, clientId: client.id.to_s)
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["errors"]).to be_empty
        expect(payload.dig("shopOrder", "status")).to eq("pending")
        expect(payload.dig("shopOrder", "rentalDueDate")).to eq((Date.today + 7).iso8601)
      end

      it "rejects a rental order without agreement acceptance" do
        sign_in(owner)
        json = graphql_post(
          query: rental_mutation,
          variables: {
            shopItemId: item.id.to_s,
            quantity: 1,
            rentalDueDate: (Date.today + 7).iso8601,
            clientId: client.id.to_s
            # no rentalAgreementAcceptedAt
          }
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["shopOrder"]).to be_nil
        expect(payload["errors"].first).to match(/rental agreement/i)
      end
    end

    context "as a client (Stripe charge required)" do
      before do
        payment_setting
        create(:client, studio: studio, user: client_user, stripe_customer_id: "cus_renter")
        allow(Stripe::PaymentIntent).to receive(:create).and_return(stripe_intent_double)
      end

      it "charges Stripe and marks paid for a rental" do
        sign_in(client_user)
        json = graphql_post(
          query: rental_mutation,
          variables: rental_vars(item, paymentMethodId: "pm_rental_valid")
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["errors"]).to be_empty
        expect(payload.dig("shopOrder", "status")).to eq("paid")
        expect(payload.dig("shopOrder", "stripePaymentIntentId")).to eq("pi_test_123")
        expect(payload.dig("shopOrder", "rentalDueDate")).to eq((Date.today + 7).iso8601)
      end

      it "decrements rental item stock on successful payment" do
        sign_in(client_user)
        graphql_post(
          query: rental_mutation,
          variables: rental_vars(item, paymentMethodId: "pm_rental_valid")
        )

        expect(item.reload.stock_quantity).to eq(1)
      end

      it "restores stock and does not persist the order when Stripe fails" do
        allow(Stripe::PaymentIntent).to receive(:create)
          .and_raise(Stripe::CardError.new("Insufficient funds", nil, code: "insufficient_funds"))

        sign_in(client_user)
        json = graphql_post(
          query: rental_mutation,
          variables: rental_vars(item, paymentMethodId: "pm_bad_rental")
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["shopOrder"]).to be_nil
        expect(payload["errors"].first).to match(/insufficient funds/i)
        expect(item.reload.stock_quantity).to eq(2)
        expect(ShopOrder.count).to eq(0)
      end

      it "completes the rental even when the confirmation email fails" do
        allow(ShopOrderMailer).to receive_message_chain(:with, :order_confirmation, :deliver_later)
          .and_raise(StandardError, "Mailer down")

        sign_in(client_user)
        json = graphql_post(
          query: rental_mutation,
          variables: rental_vars(item, paymentMethodId: "pm_rental_valid")
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["errors"]).to be_empty
        expect(payload.dig("shopOrder", "status")).to eq("paid")
      end

      it "rejects rental without agreement even with a payment method" do
        sign_in(client_user)
        json = graphql_post(
          query: rental_mutation,
          variables: {
            shopItemId: item.id.to_s,
            quantity: 1,
            paymentMethodId: "pm_rental_valid",
            rentalDueDate: (Date.today + 7).iso8601
            # no rentalAgreementAcceptedAt
          }
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["shopOrder"]).to be_nil
        expect(payload["errors"].first).to match(/rental agreement/i)
      end
    end
  end

  # ── myShopOrders query ────────────────────────────────────────────────────────

  describe "myShopOrders query" do
    let(:query) do
      <<~GRAPHQL
        query {
          myShopOrders {
            id status totalCents shopItem { title }
          }
        }
      GRAPHQL
    end

    it "returns all orders across studios for the current client user" do
      studio2 = create(:studio)
      client1 = create(:client, studio: studio,  user: client_user)
      client2 = create(:client, studio: studio2, user: client_user)

      item1 = create(:shop_item, studio: studio)
      item2 = create(:shop_item, studio: studio2)

      order1 = create(:shop_order, studio: studio,  shop_item: item1, client: client1)
      order2 = create(:shop_order, studio: studio2, shop_item: item2, client: client2)

      sign_in(client_user)
      json = graphql_post(query: query)

      expect(json["errors"]).to be_nil
      ids = json.dig("data", "myShopOrders").map { |o| o["id"].to_i }
      expect(ids).to include(order1.id, order2.id)
    end

    it "does not return other clients orders" do
      other_user   = create(:user, :client, studio: studio)
      other_client = create(:client, studio: studio, user: other_user)
      item         = create(:shop_item, studio: studio)
      other_order  = create(:shop_order, studio: studio, shop_item: item, client: other_client)

      sign_in(client_user)
      json = graphql_post(query: query)

      ids = json.dig("data", "myShopOrders").map { |o| o["id"].to_i }
      expect(ids).not_to include(other_order.id)
    end
  end
end
