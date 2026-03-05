require "rails_helper"

RSpec.describe "Client membership management", type: :request do
  let(:studio)      { create(:studio) }
  let(:owner)       { create(:user, :owner, studio: studio) }
  let(:staff)       { create(:user, :staff, studio: studio) }
  let(:instructor)  { create(:user, :instructor, studio: studio) }
  let(:client_user) { create(:user, :client, studio: studio) }
  let(:client)      { create(:client, studio: studio) }

  let(:plan) do
    create(:membership_plan, :published, studio: studio, price_cents: 13_900, currency: "cad")
  end

  before do
    PaymentSetting.delete_all
    PaymentSetting.instance_for(studio).update!(
      default_currency: "cad",
      enabled: true,
      stripe_publishable_key: "pk_test_1",
      stripe_secret_key: "sk_test_1"
    )
  end

  # ─────────────────────────────────────────────────────────────────────────
  # enrollClientMembership — staff/owner enroll a client
  # ─────────────────────────────────────────────────────────────────────────
  describe "enrollClientMembership mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($clientId: ID!, $membershipPlanId: ID!, $startedAt: ISO8601Date, $notes: String) {
          enrollClientMembership(input: {
            clientId: $clientId,
            membershipPlanId: $membershipPlanId,
            startedAt: $startedAt,
            notes: $notes
          }) {
            clientMembership {
              id
              status
              startedAt
              client { id }
              membershipPlan { id name }
            }
            errors
          }
        }
      GRAPHQL
    end

    it "allows owner to enroll a client in a membership plan" do
      sign_in(owner)

      json    = graphql_post(
        query: mutation,
        variables: { clientId: client.id.to_s, membershipPlanId: plan.id.to_s }
      )
      payload = json.dig("data", "enrollClientMembership")

      expect(payload["errors"]).to be_empty
      expect(payload.dig("clientMembership", "status")).to eq("active")
      expect(payload.dig("clientMembership", "membershipPlan", "name")).to eq(plan.name)
    end

    it "allows staff to enroll a client" do
      sign_in(staff)

      json    = graphql_post(
        query: mutation,
        variables: { clientId: client.id.to_s, membershipPlanId: plan.id.to_s }
      )
      payload = json.dig("data", "enrollClientMembership")

      expect(payload["errors"]).to be_empty
      expect(payload.dig("clientMembership", "status")).to eq("active")
    end

    it "sets a custom start date when provided" do
      start_date = 5.days.from_now.to_date.to_s
      sign_in(owner)

      json    = graphql_post(
        query: mutation,
        variables: { clientId: client.id.to_s, membershipPlanId: plan.id.to_s, startedAt: start_date }
      )
      payload = json.dig("data", "enrollClientMembership")

      expect(payload["errors"]).to be_empty
      expect(payload.dig("clientMembership", "startedAt")).to eq(start_date)
    end

    it "stores optional enrollment notes" do
      sign_in(owner)

      json    = graphql_post(
        query: mutation,
        variables: {
          clientId:        client.id.to_s,
          membershipPlanId: plan.id.to_s,
          notes:           "Referred by instructor Alex"
        }
      )
      payload = json.dig("data", "enrollClientMembership")

      expect(payload["errors"]).to be_empty
      membership = ClientMembership.find(payload.dig("clientMembership", "id").to_i)
      expect(membership.notes).to eq("Referred by instructor Alex")
    end

    it "prevents enrolling the same client twice in the same active plan" do
      create(:client_membership, :active, client: client, membership_plan: plan, studio: studio)
      sign_in(owner)

      json    = graphql_post(
        query: mutation,
        variables: { clientId: client.id.to_s, membershipPlanId: plan.id.to_s }
      )
      payload = json.dig("data", "enrollClientMembership")

      expect(payload["clientMembership"]).to be_nil
      expect(payload["errors"].join).to match(/already has an active membership/i)
    end

    it "rejects instructors from enrolling clients" do
      sign_in(instructor)

      json    = graphql_post(
        query: mutation,
        variables: { clientId: client.id.to_s, membershipPlanId: plan.id.to_s }
      )

      expect(json["errors"]).to be_present
    end

    it "rejects client users from enrolling other clients" do
      sign_in(client_user)

      json    = graphql_post(
        query: mutation,
        variables: { clientId: client.id.to_s, membershipPlanId: plan.id.to_s }
      )

      expect(json["errors"]).to be_present
    end

    it "returns an error when the membership plan belongs to another studio" do
      other_studio = create(:studio)
      other_plan   = create(:membership_plan, :published, studio: other_studio)
      sign_in(owner)

      json    = graphql_post(
        query: mutation,
        variables: { clientId: client.id.to_s, membershipPlanId: other_plan.id.to_s }
      )
      payload = json.dig("data", "enrollClientMembership")

      expect(payload["clientMembership"]).to be_nil
      expect(payload["errors"].join).to match(/not found/i)
    end

    it "returns an error when the client belongs to another studio" do
      other_studio = create(:studio)
      other_client = create(:client, studio: other_studio)
      sign_in(owner)

      json    = graphql_post(
        query: mutation,
        variables: { clientId: other_client.id.to_s, membershipPlanId: plan.id.to_s }
      )
      payload = json.dig("data", "enrollClientMembership")

      expect(payload["clientMembership"]).to be_nil
      expect(payload["errors"].join).to match(/not found/i)
    end
  end

  # ─────────────────────────────────────────────────────────────────────────
  # purchaseClientMembership — client self-purchases via Stripe
  # ─────────────────────────────────────────────────────────────────────────
  describe "purchaseClientMembership mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($membershipPlanId: ID!, $paymentMethodId: String) {
          purchaseClientMembership(input: {
            membershipPlanId: $membershipPlanId,
            paymentMethodId: $paymentMethodId
          }) {
            clientMembership {
              id
              status
              startedAt
            }
            errors
          }
        }
      GRAPHQL
    end

    it "lets a client user purchase an active membership plan via Stripe" do
      intent = double("Stripe::PaymentIntent",
        status: "succeeded",
        id: "pi_membership_1",
        to_hash: { "id" => "pi_membership_1" }
      )
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

      sign_in(client_user)
      json    = graphql_post(
        query: mutation,
        variables: { membershipPlanId: plan.id.to_s, paymentMethodId: "pm_card" }
      )
      payload = json.dig("data", "purchaseClientMembership")

      expect(payload["errors"]).to be_empty
      expect(payload.dig("clientMembership", "status")).to eq("active")
    end

    it "auto-creates a client record for the user when one does not exist" do
      intent = double("Stripe::PaymentIntent",
        status: "succeeded",
        id: "pi_membership_2",
        to_hash: { "id" => "pi_membership_2" }
      )
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

      sign_in(client_user)
      expect {
        graphql_post(
          query: mutation,
          variables: { membershipPlanId: plan.id.to_s, paymentMethodId: "pm_card" }
        )
      }.to change { Client.where(user_id: client_user.id, studio_id: studio.id).count }.by(1)
    end

    it "returns an error when Stripe charge does not succeed" do
      intent = double("Stripe::PaymentIntent",
        status: "requires_payment_method",
        id: "pi_fail",
        to_hash: {}
      )
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

      sign_in(client_user)
      json    = graphql_post(
        query: mutation,
        variables: { membershipPlanId: plan.id.to_s, paymentMethodId: "pm_card" }
      )
      payload = json.dig("data", "purchaseClientMembership")

      expect(payload["clientMembership"]).to be_nil
      expect(payload["errors"].join).to match(/payment did not succeed/i)
    end

    it "propagates Stripe card errors as user-facing messages" do
      allow(Stripe::PaymentIntent).to receive(:create)
        .and_raise(Stripe::CardError.new("Insufficient funds.", nil, code: "insufficient_funds"))

      sign_in(client_user)
      json    = graphql_post(
        query: mutation,
        variables: { membershipPlanId: plan.id.to_s, paymentMethodId: "pm_declined" }
      )
      payload = json.dig("data", "purchaseClientMembership")

      expect(payload["clientMembership"]).to be_nil
      expect(payload["errors"].join).to match(/insufficient funds/i)
    end

    it "prevents purchasing an inactive/unpublished plan" do
      inactive_plan = create(:membership_plan, studio: studio, active: false)
      sign_in(client_user)

      json    = graphql_post(
        query: mutation,
        variables: { membershipPlanId: inactive_plan.id.to_s, paymentMethodId: "pm_card" }
      )
      payload = json.dig("data", "purchaseClientMembership")

      expect(payload["clientMembership"]).to be_nil
      expect(payload["errors"].join).to match(/not found or unavailable/i)
    end

    it "prevents purchasing the same active plan twice" do
      existing_client = Client.find_or_create_by!(user_id: client_user.id, studio_id: studio.id) do |c|
        c.name  = client_user.name
        c.email = client_user.email
      end
      create(:client_membership, :active, client: existing_client, membership_plan: plan, studio: studio)

      sign_in(client_user)
      json    = graphql_post(
        query: mutation,
        variables: { membershipPlanId: plan.id.to_s, paymentMethodId: "pm_card" }
      )
      payload = json.dig("data", "purchaseClientMembership")

      expect(payload["clientMembership"]).to be_nil
      expect(payload["errors"].join).to match(/already have an active membership/i)
    end

    it "returns an error when no payment method is provided and client has no card on file" do
      sign_in(client_user)
      json    = graphql_post(
        query: mutation,
        variables: { membershipPlanId: plan.id.to_s }
      )
      payload = json.dig("data", "purchaseClientMembership")

      expect(payload["clientMembership"]).to be_nil
      expect(payload["errors"].join).to match(/no payment method/i)
    end

    it "returns an error when Stripe is not configured for the studio" do
      PaymentSetting.instance_for(studio).update!(stripe_secret_key: nil, stripe_publishable_key: nil, enabled: false)

      sign_in(client_user)
      json    = graphql_post(
        query: mutation,
        variables: { membershipPlanId: plan.id.to_s, paymentMethodId: "pm_card" }
      )
      payload = json.dig("data", "purchaseClientMembership")

      expect(payload["clientMembership"]).to be_nil
      expect(payload["errors"].join).to match(/payments are not configured/i)
    end

    it "rejects non-client roles from using the self-purchase endpoint" do
      sign_in(staff)
      json    = graphql_post(
        query: mutation,
        variables: { membershipPlanId: plan.id.to_s, paymentMethodId: "pm_card" }
      )
      payload = json.dig("data", "purchaseClientMembership")

      expect(payload["clientMembership"]).to be_nil
      expect(payload["errors"].join).to match(/not authorized/i)
    end

    it "rejects unauthenticated callers" do
      json    = graphql_post(
        query: mutation,
        variables: { membershipPlanId: plan.id.to_s, paymentMethodId: "pm_card" }
      )
      payload = json.dig("data", "purchaseClientMembership")

      expect(payload["clientMembership"]).to be_nil
      expect(payload["errors"].join).to match(/not authenticated/i)
    end
  end
end
