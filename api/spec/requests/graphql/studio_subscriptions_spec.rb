require "rails_helper"

RSpec.describe "Studio subscriptions GraphQL", type: :request do
  let(:god_studio) { create(:studio) }
  let(:god) { create(:user, email: "dvorkin212@gmail.com", studio: god_studio) }

  let(:studio_a) { create(:studio) }
  let(:owner_a) { create(:user, :owner, studio: studio_a) }

  let(:studio_b) { create(:studio) }
  let(:owner_b) { create(:user, :owner, studio: studio_b) }

  # ─── studioSubscriptions (godmode only) ──────────────────────────────────────

  describe "studioSubscriptions query" do
    let(:query) do
      <<~GRAPHQL
        query {
          studioSubscriptions {
            id studioId tier status priceCad active
            studio { id name }
          }
        }
      GRAPHQL
    end

    it "returns all subscriptions for godmode" do
      create(:studio_subscription, :basic,   studio: studio_a, status: "active")
      create(:studio_subscription, :premium, studio: studio_b, status: "trialing")
      sign_in(god)

      json = graphql_post(query: query)
      subs = json.dig("data", "studioSubscriptions")

      expect(json["errors"]).to be_nil
      expect(subs.length).to eq(2)
    end

    it "returns correct priceCad for each tier" do
      create(:studio_subscription, :basic,   studio: studio_a)
      create(:studio_subscription, :premium, studio: studio_b)
      sign_in(god)

      json = graphql_post(query: query)
      subs = json.dig("data", "studioSubscriptions")
      prices = subs.map { |s| [ s["tier"], s["priceCad"] ] }.to_h

      expect(prices["basic"]).to eq((59 * 1.35).round)
      expect(prices["premium"]).to eq((129 * 1.35).round)
    end

    it "raises not authorized for a regular owner" do
      sign_in(owner_a)
      json = graphql_post(query: query)

      expect(json["errors"]).not_to be_nil
      expect(json.dig("data", "studioSubscriptions")).to be_nil
    end

    it "raises not authorized for unauthenticated user" do
      json = graphql_post(query: query)
      expect(json["errors"]).not_to be_nil
    end
  end

  # ─── myStudioSubscription (owner) ────────────────────────────────────────────

  describe "myStudioSubscription query" do
    let(:query) do
      <<~GRAPHQL
        query {
          myStudioSubscription {
            id tier status priceCad active currentPeriodEnd
            studio { id name slug }
          }
        }
      GRAPHQL
    end

    it "returns the subscription for the owner's studio" do
      sub = create(:studio_subscription, :premium, studio: studio_a, status: "active")
      sign_in(owner_a)

      json = graphql_post(query: query)
      data = json.dig("data", "myStudioSubscription")

      expect(json["errors"]).to be_nil
      expect(data["id"]).to eq(sub.id.to_s)
      expect(data["tier"]).to eq("premium")
      expect(data["priceCad"]).to eq((129 * 1.35).round)
      expect(data["active"]).to eq(true)
    end

    it "returns nil when no subscription exists" do
      sign_in(owner_a)

      json = graphql_post(query: query)
      expect(json["errors"]).to be_nil
      expect(json.dig("data", "myStudioSubscription")).to be_nil
    end

    it "scopes to the authenticated owner's studio, not another studio" do
      create(:studio_subscription, :premium, studio: studio_b, status: "active")
      sign_in(owner_a)  # owner_a belongs to studio_a, which has no sub

      json = graphql_post(query: query)
      expect(json.dig("data", "myStudioSubscription")).to be_nil
    end

    it "requires authentication" do
      json = graphql_post(query: query)
      expect(json["errors"]).not_to be_nil
    end
  end

  # ─── upsertStudioSubscription (godmode only) ─────────────────────────────────

  describe "upsertStudioSubscription mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($studioId: ID!, $tier: String, $status: String, $notes: String) {
          upsertStudioSubscription(input: {
            studioId: $studioId
            tier: $tier
            status: $status
            notes: $notes
          }) {
            studioSubscription { id tier status notes studioId }
            errors
          }
        }
      GRAPHQL
    end

    it "creates a new subscription for godmode" do
      sign_in(god)

      json = graphql_post(
        query: mutation,
        variables: { studioId: studio_a.id.to_s, tier: "basic", status: "trialing", notes: "Test note" }
      )
      payload = json.dig("data", "upsertStudioSubscription")

      expect(payload["errors"]).to eq([])
      expect(payload.dig("studioSubscription", "tier")).to eq("basic")
      expect(payload.dig("studioSubscription", "status")).to eq("trialing")
      expect(payload.dig("studioSubscription", "notes")).to eq("Test note")
    end

    it "updates an existing subscription" do
      create(:studio_subscription, :basic, studio: studio_a, status: "trialing")
      sign_in(god)

      json = graphql_post(
        query: mutation,
        variables: { studioId: studio_a.id.to_s, tier: "premium", status: "active" }
      )
      payload = json.dig("data", "upsertStudioSubscription")

      expect(payload["errors"]).to eq([])
      expect(payload.dig("studioSubscription", "tier")).to eq("premium")
      expect(payload.dig("studioSubscription", "status")).to eq("active")
    end

    it "rejects invalid tier" do
      sign_in(god)

      json = graphql_post(
        query: mutation,
        variables: { studioId: studio_a.id.to_s, tier: "enterprise", status: "active" }
      )
      payload = json.dig("data", "upsertStudioSubscription")

      expect(payload["errors"]).not_to be_empty
      expect(payload["studioSubscription"]).to be_nil
    end

    it "rejects invalid status" do
      sign_in(god)

      json = graphql_post(
        query: mutation,
        variables: { studioId: studio_a.id.to_s, tier: "basic", status: "unknown_status" }
      )
      payload = json.dig("data", "upsertStudioSubscription")
      expect(payload["errors"]).not_to be_empty
    end

    it "rejects non-godmode owner" do
      sign_in(owner_a)

      json = graphql_post(
        query: mutation,
        variables: { studioId: studio_a.id.to_s, tier: "basic", status: "active" }
      )
      expect(json["errors"]).not_to be_nil
    end

    it "returns error for non-existent studio" do
      sign_in(god)

      json = graphql_post(
        query: mutation,
        variables: { studioId: "999999", tier: "basic", status: "active" }
      )
      payload = json.dig("data", "upsertStudioSubscription")
      expect(payload["errors"]).to include("Studio not found")
    end

    it "sets cancelled_at when status is set to cancelled" do
      create(:studio_subscription, :basic, studio: studio_a, status: "active")
      sign_in(god)

      json = graphql_post(
        query: mutation,
        variables: { studioId: studio_a.id.to_s, status: "cancelled" }
      )
      payload = json.dig("data", "upsertStudioSubscription")
      sub = StudioSubscription.find(payload.dig("studioSubscription", "id"))

      expect(payload["errors"]).to eq([])
      expect(sub.cancelled_at).not_to be_nil
    end

    it "clears cancelled_at when status is restored to active" do
      create(:studio_subscription, :cancelled, studio: studio_a)
      sign_in(god)

      json = graphql_post(
        query: mutation,
        variables: { studioId: studio_a.id.to_s, status: "active" }
      )
      payload = json.dig("data", "upsertStudioSubscription")
      sub = StudioSubscription.find(payload.dig("studioSubscription", "id"))

      expect(sub.cancelled_at).to be_nil
    end
  end

  # ─── createPlatformSubscriptionCheckout ──────────────────────────────────────

  describe "createPlatformSubscriptionCheckout mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($tier: String!) {
          createPlatformSubscriptionCheckout(input: { tier: $tier }) {
            checkoutUrl
            errors
          }
        }
      GRAPHQL
    end

    before do
      stub_const("ENV", ENV.to_h.merge(
        "PLATFORM_STRIPE_SECRET_KEY" => "sk_test_platform",
        "PLATFORM_STRIPE_PRICE_BASIC" => "price_basic_test",
        "PLATFORM_STRIPE_PRICE_PREMIUM" => "price_premium_test",
        "PLATFORM_STRIPE_PRICE_PRO" => "price_pro_test",
        "PLATFORM_STRIPE_PRICE_STUDIO" => "price_studio_test",
        "WEB_APP_URL" => "http://localhost:5173"
      ))
    end

    it "returns a checkout URL for a valid owner with valid tier" do
      fake_customer = double("Stripe::Customer", id: "cus_new")
      fake_session  = double("Stripe::Checkout::Session", url: "https://checkout.stripe.com/test_session")

      allow(Stripe::Customer).to receive(:create).and_return(fake_customer)
      allow(Stripe::Checkout::Session).to receive(:create).and_return(fake_session)

      sign_in(owner_a)
      json = graphql_post(query: mutation, variables: { tier: "basic" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to eq([])
      expect(payload["checkoutUrl"]).to eq("https://checkout.stripe.com/test_session")
    end

    it "reuses existing stripe_customer_id if already set" do
      create(:studio_subscription, studio: studio_a, stripe_customer_id: "cus_existing", status: "cancelled")

      fake_session = double("Stripe::Checkout::Session", url: "https://checkout.stripe.com/reuse")
      allow(Stripe::Checkout::Session).to receive(:create).and_return(fake_session)

      sign_in(owner_a)
      json = graphql_post(query: mutation, variables: { tier: "premium" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to eq([])
      # Stripe::Customer.create was never called because cus_existing was reused
      expect(Stripe::Checkout::Session).to have_received(:create).with(
        hash_including(customer: "cus_existing")
      )
    end

    it "rejects invalid tier" do
      sign_in(owner_a)
      json = graphql_post(query: mutation, variables: { tier: "enterprise" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to include("Invalid tier")
      expect(payload["checkoutUrl"]).to be_nil
    end

    it "rejects godmode user (not a real owner)" do
      sign_in(god)
      json = graphql_post(query: mutation, variables: { tier: "basic" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to include("Not authorized")
    end

    it "rejects already-active same-tier subscription" do
      create(:studio_subscription, :basic, studio: studio_a, status: "active")
      sign_in(owner_a)

      json = graphql_post(query: mutation, variables: { tier: "basic" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to include(match(/already have an active/))
    end

    it "returns error when platform key is not configured" do
      stub_const("ENV", ENV.to_h.except("PLATFORM_STRIPE_SECRET_KEY"))
      sign_in(owner_a)

      json = graphql_post(query: mutation, variables: { tier: "basic" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to include(match(/not configured/))
    end

    it "returns error when price env var is missing" do
      stub_const("ENV", ENV.to_h.merge(
        "PLATFORM_STRIPE_SECRET_KEY" => "sk_test_platform"
      ).except("PLATFORM_STRIPE_PRICE_BASIC"))

      sign_in(owner_a)
      json = graphql_post(query: mutation, variables: { tier: "basic" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to include(match(/not configured/))
    end

    it "surfaces Stripe errors gracefully" do
      allow(Stripe::Customer).to receive(:create).and_raise(Stripe::StripeError.new("Card declined"))
      sign_in(owner_a)

      json = graphql_post(query: mutation, variables: { tier: "basic" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to include("Card declined")
    end

    # ── new tier: pro ──────────────────────────────────────────────────────────

    it "returns a checkout URL for the pro tier" do
      fake_customer = double("Stripe::Customer", id: "cus_pro")
      fake_session  = double("Stripe::Checkout::Session", url: "https://checkout.stripe.com/pro_session")

      allow(Stripe::Customer).to receive(:create).and_return(fake_customer)
      allow(Stripe::Checkout::Session).to receive(:create).and_return(fake_session)

      sign_in(owner_a)
      json = graphql_post(query: mutation, variables: { tier: "pro" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to eq([])
      expect(payload["checkoutUrl"]).to eq("https://checkout.stripe.com/pro_session")
      expect(Stripe::Checkout::Session).to have_received(:create).with(
        hash_including(line_items: [ { price: "price_pro_test", quantity: 1 } ])
      )
    end

    it "returns a checkout URL for the studio tier" do
      fake_customer = double("Stripe::Customer", id: "cus_studio")
      fake_session  = double("Stripe::Checkout::Session", url: "https://checkout.stripe.com/studio_session")

      allow(Stripe::Customer).to receive(:create).and_return(fake_customer)
      allow(Stripe::Checkout::Session).to receive(:create).and_return(fake_session)

      sign_in(owner_a)
      json = graphql_post(query: mutation, variables: { tier: "studio" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to eq([])
      expect(payload["checkoutUrl"]).to eq("https://checkout.stripe.com/studio_session")
      expect(Stripe::Checkout::Session).to have_received(:create).with(
        hash_including(line_items: [ { price: "price_studio_test", quantity: 1 } ])
      )
    end

    it "success and cancel URLs point to /owner/subscription" do
      fake_customer = double("Stripe::Customer", id: "cus_url_check")
      fake_session  = double("Stripe::Checkout::Session", url: "https://checkout.stripe.com/url_check")

      allow(Stripe::Customer).to receive(:create).and_return(fake_customer)
      allow(Stripe::Checkout::Session).to receive(:create).and_return(fake_session)

      sign_in(owner_a)
      graphql_post(query: mutation, variables: { tier: "pro" })

      expect(Stripe::Checkout::Session).to have_received(:create).with(
        hash_including(
          success_url: match(%r{/owner/subscription\?checkout_success=1}),
          cancel_url:  match(%r{/owner/subscription\?checkout_cancelled=1})
        )
      )
    end

    # ── starter tier: free — no Stripe involved ─────────────────────────────────

    it "downgrades to starter without calling Stripe — updates sub directly" do
      create(:studio_subscription, :pro, studio: studio_a, status: "active",
             stripe_customer_id: "cus_existing", stripe_subscription_id: "sub_existing")
      sign_in(owner_a)

      expect(Stripe::Checkout::Session).not_to receive(:create)

      json = graphql_post(query: mutation, variables: { tier: "starter" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to eq([])
      expect(payload["checkoutUrl"]).to include("/owner/subscription?checkout_success=1")

      sub = StudioSubscription.find_by(studio_id: studio_a.id)
      expect(sub.tier).to eq("starter")
      expect(sub.status).to eq("active")
      expect(sub.stripe_subscription_id).to be_nil
    end

    it "creates a starter subscription from scratch without Stripe" do
      sign_in(owner_a)

      expect(Stripe::Checkout::Session).not_to receive(:create)
      expect(Stripe::Customer).not_to receive(:create)

      json = graphql_post(query: mutation, variables: { tier: "starter" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to eq([])
      sub = StudioSubscription.find_by(studio_id: studio_a.id)
      expect(sub).not_to be_nil
      expect(sub.tier).to eq("starter")
    end

    it "returns error for starter when already on active starter" do
      create(:studio_subscription, :starter, studio: studio_a, status: "active")
      sign_in(owner_a)

      json = graphql_post(query: mutation, variables: { tier: "starter" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to include(match(/already have an active/))
    end

    it "returns error when pro price env var is missing" do
      stub_const("ENV", ENV.to_h.merge(
        "PLATFORM_STRIPE_SECRET_KEY" => "sk_test_platform",
        "WEB_APP_URL" => "http://localhost:5173"
      ).except("PLATFORM_STRIPE_PRICE_PRO"))

      sign_in(owner_a)
      json = graphql_post(query: mutation, variables: { tier: "pro" })
      payload = json.dig("data", "createPlatformSubscriptionCheckout")

      expect(payload["errors"]).to include(match(/not configured/))
    end
  end

  # ─── createBillingPortalSession ──────────────────────────────────────────────

  describe "createBillingPortalSession mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation {
          createBillingPortalSession(input: {}) {
            portalUrl
            errors
          }
        }
      GRAPHQL
    end

    before do
      stub_const("ENV", ENV.to_h.merge(
        "PLATFORM_STRIPE_SECRET_KEY" => "sk_test_platform",
        "WEB_APP_URL" => "http://localhost:5173"
      ))
    end

    it "returns a portal URL for owner with existing stripe customer" do
      create(:studio_subscription, studio: studio_a, stripe_customer_id: "cus_portal")
      fake_session = double("Stripe::BillingPortal::Session", url: "https://billing.stripe.com/portal_session")
      allow(Stripe::BillingPortal::Session).to receive(:create).and_return(fake_session)

      sign_in(owner_a)
      json = graphql_post(query: mutation)
      payload = json.dig("data", "createBillingPortalSession")

      expect(payload["errors"]).to eq([])
      expect(payload["portalUrl"]).to eq("https://billing.stripe.com/portal_session")
    end

    it "passes the correct return_url pointing to /owner/subscription" do
      create(:studio_subscription, studio: studio_a, stripe_customer_id: "cus_return")
      fake_session = double("Stripe::BillingPortal::Session", url: "https://billing.stripe.com/s")
      allow(Stripe::BillingPortal::Session).to receive(:create).and_return(fake_session)

      sign_in(owner_a)
      graphql_post(query: mutation)

      expect(Stripe::BillingPortal::Session).to have_received(:create).with(
        hash_including(
          customer: "cus_return",
          return_url: "http://localhost:5173/owner/subscription"
        )
      )
    end

    it "returns error when no subscription or stripe customer exists" do
      sign_in(owner_a)
      json = graphql_post(query: mutation)
      payload = json.dig("data", "createBillingPortalSession")

      expect(payload["errors"]).to include(match(/No billing account/))
      expect(payload["portalUrl"]).to be_nil
    end

    it "returns error when platform key is not configured" do
      stub_const("ENV", ENV.to_h.except("PLATFORM_STRIPE_SECRET_KEY"))
      create(:studio_subscription, studio: studio_a, stripe_customer_id: "cus_x")
      sign_in(owner_a)

      json = graphql_post(query: mutation)
      payload = json.dig("data", "createBillingPortalSession")

      expect(payload["errors"]).to include(match(/not configured/))
    end

    it "rejects unauthenticated requests" do
      json = graphql_post(query: mutation)
      payload = json.dig("data", "createBillingPortalSession")

      expect(payload["errors"]).to include("Not authenticated")
    end

    it "rejects godmode user" do
      create(:studio_subscription, studio: god_studio, stripe_customer_id: "cus_god")
      sign_in(god)

      json = graphql_post(query: mutation)
      payload = json.dig("data", "createBillingPortalSession")

      expect(payload["errors"]).to include("Not authorized")
    end

    it "surfaces Stripe errors gracefully" do
      create(:studio_subscription, studio: studio_a, stripe_customer_id: "cus_err")
      allow(Stripe::BillingPortal::Session).to receive(:create)
        .and_raise(Stripe::StripeError.new("Customer not found"))

      sign_in(owner_a)
      json = graphql_post(query: mutation)
      payload = json.dig("data", "createBillingPortalSession")

      expect(payload["errors"]).to include("Customer not found")
      expect(payload["portalUrl"]).to be_nil
    end
  end
end
