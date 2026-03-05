require "rails_helper"

RSpec.describe "Bundle bookings", type: :request do
  let(:studio)      { create(:studio) }
  let(:owner)       { create(:user, :owner, studio: studio) }
  let(:staff)       { create(:user, :staff, studio: studio) }
  let(:instructor)  { create(:user, :instructor, studio: studio) }
  let(:client_user) { create(:user, :client, studio: studio) }
  let(:client)      { create(:client, studio: studio) }

  let(:template) do
    create(:class_template,
      instructor: instructor,
      price_cents: 3_000,
      currency: "cad"
    )
  end
  let(:session) do
    create(:class_session,
      class_template: template,
      instructor: instructor,
      start_time: 3.days.from_now.change(sec: 0),
      bundle_enabled: true,
      bundle_spots: 6
    )
  end

  let(:bundle_product) do
    BundleProduct.create!(
      studio: studio,
      title: "6-Class Pack",
      description: nil,
      active: true,
      credits_count: 6,
      price_cents: 18_000,
      currency: "cad",
      class_template: template
    )
  end

  let(:bundle_purchase) do
    BundlePurchase.create!(
      studio: studio,
      client: client,
      bundle_product: bundle_product,
      status: "succeeded",
      credits_total: 6,
      credits_remaining: 6,
      price_cents: 18_000,
      unit_price_cents: 3_000,
      remainder_cents: 0,
      currency: "cad",
      stripe_payment_intent_id: "pi_existing"
    )
  end

  before do
    allow(NotificationJob).to receive(:perform_now)
    PaymentSetting.delete_all
    PaymentSetting.instance_for(studio).update!(
      default_currency: "cad",
      enabled: true,
      stripe_publishable_key: "pk_test_1",
      stripe_secret_key: "sk_test_1"
    )
  end

  # ─────────────────────────────────────────────────────────────────────────
  # createBookingWithBundle
  # ─────────────────────────────────────────────────────────────────────────
  describe "createBookingWithBundle mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($clientId: ID, $classSessionId: ID!, $bundlePurchaseId: ID!) {
          createBookingWithBundle(input: {
            clientId: $clientId,
            classSessionId: $classSessionId,
            bundlePurchaseId: $bundlePurchaseId
          }) {
            booking { id status paid priceCents }
            payment { id status amountCents }
            bundlePurchase { id creditsRemaining }
            errors
          }
        }
      GRAPHQL
    end

    it "lets staff book a client using a bundle purchase credit" do
      sign_in(staff)

      json    = graphql_post(
        query: mutation,
        variables: {
          clientId:        client.id.to_s,
          classSessionId:  session.id.to_s,
          bundlePurchaseId: bundle_purchase.id.to_s
        }
      )
      payload = json.dig("data", "createBookingWithBundle")

      expect(payload["errors"]).to be_empty
      expect(payload.dig("booking", "paid")).to be true
      expect(payload.dig("bundlePurchase", "creditsRemaining")).to eq(5)
      expect(NotificationJob).to have_received(:perform_now)
    end

    it "decrements bundle credits by 1 after booking" do
      sign_in(staff)
      initial_credits = bundle_purchase.credits_remaining

      graphql_post(
        query: mutation,
        variables: {
          clientId:        client.id.to_s,
          classSessionId:  session.id.to_s,
          bundlePurchaseId: bundle_purchase.id.to_s
        }
      )

      expect(bundle_purchase.reload.credits_remaining).to eq(initial_credits - 1)
    end

    it "creates a Payment record linked to the booking" do
      sign_in(staff)

      expect {
        graphql_post(
          query: mutation,
          variables: {
            clientId:        client.id.to_s,
            classSessionId:  session.id.to_s,
            bundlePurchaseId: bundle_purchase.id.to_s
          }
        )
      }.to change(Payment, :count).by(1)

      payment = Payment.last
      expect(payment.status).to eq("succeeded")
    end

    it "rejects when bundle purchase belongs to a different client" do
      other_client   = create(:client, studio: studio)
      wrong_purchase = BundlePurchase.create!(
        studio: studio,
        client: other_client,
        bundle_product: bundle_product,
        status: "succeeded",
        credits_total: 6,
        credits_remaining: 6,
        price_cents: 18_000,
        unit_price_cents: 3_000,
        remainder_cents: 0,
        currency: "cad",
        stripe_payment_intent_id: "pi_other"
      )

      sign_in(staff)
      json    = graphql_post(
        query: mutation,
        variables: {
          clientId:        client.id.to_s,
          classSessionId:  session.id.to_s,
          bundlePurchaseId: wrong_purchase.id.to_s
        }
      )
      payload = json.dig("data", "createBookingWithBundle")

      expect(payload["booking"]).to be_nil
      expect(payload["errors"].join).to match(/does not belong/i)
    end

    it "rejects when bundle has no credits remaining" do
      empty_purchase = BundlePurchase.create!(
        studio: studio,
        client: client,
        bundle_product: bundle_product,
        status: "succeeded",
        credits_total: 6,
        credits_remaining: 0,
        price_cents: 18_000,
        unit_price_cents: 3_000,
        remainder_cents: 0,
        currency: "cad",
        stripe_payment_intent_id: "pi_empty"
      )

      sign_in(staff)
      json    = graphql_post(
        query: mutation,
        variables: {
          clientId:        client.id.to_s,
          classSessionId:  session.id.to_s,
          bundlePurchaseId: empty_purchase.id.to_s
        }
      )
      payload = json.dig("data", "createBookingWithBundle")

      expect(payload["booking"]).to be_nil
      expect(payload["errors"].join).to match(/no bundle spots/i)
    end

    it "rejects when instructor has blocked the client" do
      create(:instructor_client_block, instructor: instructor, client: client, studio: studio)
      sign_in(staff)

      json    = graphql_post(
        query: mutation,
        variables: {
          clientId:        client.id.to_s,
          classSessionId:  session.id.to_s,
          bundlePurchaseId: bundle_purchase.id.to_s
        }
      )
      payload = json.dig("data", "createBookingWithBundle")

      expect(payload["booking"]).to be_nil
      expect(payload["errors"].join).to match(/blocked/i)
    end

    it "rejects unauthenticated requests" do
      json    = graphql_post(
        query: mutation,
        variables: {
          clientId:        client.id.to_s,
          classSessionId:  session.id.to_s,
          bundlePurchaseId: bundle_purchase.id.to_s
        }
      )
      payload = json.dig("data", "createBookingWithBundle")

      expect(payload["booking"]).to be_nil
      expect(payload["errors"].join).to match(/not authenticated/i)
    end
  end

  # ─────────────────────────────────────────────────────────────────────────
  # purchaseBundleProduct
  # ─────────────────────────────────────────────────────────────────────────
  describe "purchaseBundleProduct mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($bundleProductId: ID!, $clientId: ID, $paymentMethodId: String) {
          purchaseBundleProduct(input: {
            bundleProductId: $bundleProductId,
            clientId: $clientId,
            paymentMethodId: $paymentMethodId
          }) {
            bundlePurchase {
              id
              status
              creditsTotal
              creditsRemaining
              priceCents
            }
            errors
          }
        }
      GRAPHQL
    end

    it "allows staff to purchase a bundle for a client when Stripe succeeds" do
      intent = double("Stripe::PaymentIntent",
        status: "succeeded",
        id: "pi_bundle_buy",
        to_hash: { "id" => "pi_bundle_buy" }
      )
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

      sign_in(staff)
      json    = graphql_post(
        query: mutation,
        variables: {
          bundleProductId:  bundle_product.id.to_s,
          clientId:         client.id.to_s,
          paymentMethodId:  "pm_test"
        }
      )
      payload = json.dig("data", "purchaseBundleProduct")

      expect(payload["errors"]).to be_empty
      expect(payload.dig("bundlePurchase", "creditsTotal")).to eq(6)
      expect(payload.dig("bundlePurchase", "creditsRemaining")).to eq(6)
      expect(payload.dig("bundlePurchase", "status")).to eq("succeeded")
    end

    it "returns an error when Stripe payment does not succeed" do
      intent = double("Stripe::PaymentIntent",
        status: "requires_payment_method",
        id: "pi_fail",
        to_hash: {}
      )
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

      sign_in(staff)
      json    = graphql_post(
        query: mutation,
        variables: {
          bundleProductId: bundle_product.id.to_s,
          clientId:        client.id.to_s,
          paymentMethodId: "pm_test"
        }
      )
      payload = json.dig("data", "purchaseBundleProduct")

      expect(payload["bundlePurchase"]).to be_nil
      expect(payload["errors"].join).to match(/payment did not succeed/i)
    end

    it "propagates Stripe errors as user-facing error messages" do
      allow(Stripe::PaymentIntent).to receive(:create)
        .and_raise(Stripe::CardError.new("Your card was declined.", nil, code: "card_declined"))

      sign_in(staff)
      json    = graphql_post(
        query: mutation,
        variables: {
          bundleProductId: bundle_product.id.to_s,
          clientId:        client.id.to_s,
          paymentMethodId: "pm_declined"
        }
      )
      payload = json.dig("data", "purchaseBundleProduct")

      expect(payload["bundlePurchase"]).to be_nil
      expect(payload["errors"].join).to match(/declined/i)
    end

    it "returns an error when Stripe is not configured" do
      PaymentSetting.instance_for(studio).update!(stripe_secret_key: nil, stripe_publishable_key: nil, enabled: false)

      sign_in(staff)
      json    = graphql_post(
        query: mutation,
        variables: {
          bundleProductId: bundle_product.id.to_s,
          clientId:        client.id.to_s,
          paymentMethodId: "pm_test"
        }
      )
      payload = json.dig("data", "purchaseBundleProduct")

      expect(payload["bundlePurchase"]).to be_nil
      expect(payload["errors"].join).to match(/stripe is not configured/i)
    end

    it "returns an error when client_id is missing for a staff user" do
      sign_in(staff)
      json    = graphql_post(
        query: mutation,
        variables: {
          bundleProductId: bundle_product.id.to_s,
          paymentMethodId: "pm_test"
        }
      )
      payload = json.dig("data", "purchaseBundleProduct")

      expect(payload["bundlePurchase"]).to be_nil
      expect(payload["errors"].join).to match(/client is required/i)
    end

    context "as a client user (marketplace flow)" do
      let(:marketplace_studio)  { create(:studio) }
      let(:marketplace_client_user) { create(:user, :client, studio: marketplace_studio) }
      let(:marketplace_instructor) { create(:user, :instructor, studio: marketplace_studio) }
      let(:marketplace_template) do
        create(:class_template,
          instructor: marketplace_instructor,
          price_cents: 3_000,
          currency: "cad"
        )
      end
      let(:marketplace_session) do
        create(:class_session,
          class_template: marketplace_template,
          instructor: marketplace_instructor,
          start_time: 3.days.from_now.change(sec: 0),
          bundle_enabled: true,
          bundle_spots: 6
        )
      end
      let(:marketplace_product) do
        BundleProduct.create!(
          studio: marketplace_studio,
          title: "Marketplace Pack",
          active: true,
          credits_count: 5,
          price_cents: 15_000,
          currency: "cad",
          class_template: marketplace_template
        )
      end

      before do
        PaymentSetting.delete_all
        PaymentSetting.instance_for(marketplace_studio).update!(
          default_currency: "cad",
          enabled: true,
          stripe_publishable_key: "pk_test_mkt",
          stripe_secret_key: "sk_test_mkt"
        )
      end

      it "creates a client record automatically when client purchases as marketplace user" do
        intent = double("Stripe::PaymentIntent",
          status: "succeeded",
          id: "pi_mkt_1",
          to_hash: { "id" => "pi_mkt_1" }
        )
        allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

        sign_in(marketplace_client_user)
        json    = graphql_post(
          query: mutation,
          variables: {
            bundleProductId: marketplace_product.id.to_s,
            paymentMethodId: "pm_client_card"
          }
        )
        payload = json.dig("data", "purchaseBundleProduct")

        expect(payload["errors"]).to be_empty
        expect(payload.dig("bundlePurchase", "creditsTotal")).to eq(5)
        expect(
          Client.find_by(user_id: marketplace_client_user.id, studio_id: marketplace_studio.id)
        ).to be_present
      end
    end
  end
end
