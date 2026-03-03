require "rails_helper"

RSpec.describe "Memberships GraphQL", type: :request do
  let(:studio)  { create(:studio) }
  let(:owner)   { create(:user, :owner, studio: studio) }
  let(:staff)   { create(:user, :staff, studio: studio) }
  let(:client_user) { create(:user, :client, studio: studio) }

  # ─── Helpers ─────────────────────────────────────────────────────────────────

  let(:plans_query) do
    <<~GRAPHQL
      query MembershipPlans {
        membershipPlans {
          id name active priceCents currency
          reformerClassesPerMonth matClassesPerMonth
          includesPriorityBooking includesEarlyBooking
          privateSessionDiscountPercent guestPassesPerMonth
          includesRetailDiscount minCommitmentMonths autoRenew
          enrolledCount
        }
      }
    GRAPHQL
  end

  let(:enrollments_query) do
    <<~GRAPHQL
      query ClientMemberships($status: String) {
        clientMemberships(status: $status) {
          id status startedAt
          client    { id name email }
          membershipPlan { id name priceCents }
        }
      }
    GRAPHQL
  end

  let(:create_plan_mutation) do
    <<~GRAPHQL
      mutation CreateMembershipPlan(
        $name: String!
        $priceCents: Int!
        $currency: String
        $reformerClassesPerMonth: Int
        $minCommitmentMonths: Int
        $active: Boolean
      ) {
        createMembershipPlan(input: {
          name: $name
          priceCents: $priceCents
          currency: $currency
          reformerClassesPerMonth: $reformerClassesPerMonth
          minCommitmentMonths: $minCommitmentMonths
          active: $active
        }) {
          membershipPlan { id name priceCents active enrolledCount }
          errors
        }
      }
    GRAPHQL
  end

  let(:update_plan_mutation) do
    <<~GRAPHQL
      mutation UpdateMembershipPlan($id: ID!, $name: String, $active: Boolean, $priceCents: Int) {
        updateMembershipPlan(input: { id: $id, name: $name, active: $active, priceCents: $priceCents }) {
          membershipPlan { id name active priceCents }
          errors
        }
      }
    GRAPHQL
  end

  let(:delete_plan_mutation) do
    <<~GRAPHQL
      mutation DeleteMembershipPlan($id: ID!) {
        deleteMembershipPlan(input: { id: $id }) {
          success
          errors
        }
      }
    GRAPHQL
  end

  let(:enroll_mutation) do
    <<~GRAPHQL
      mutation EnrollClientMembership($clientId: ID!, $membershipPlanId: ID!, $startedAt: ISO8601Date) {
        enrollClientMembership(input: {
          clientId: $clientId
          membershipPlanId: $membershipPlanId
          startedAt: $startedAt
        }) {
          clientMembership { id status startedAt client { id } membershipPlan { id } }
          errors
        }
      }
    GRAPHQL
  end

  let(:update_enrollment_mutation) do
    <<~GRAPHQL
      mutation UpdateClientMembership($id: ID!, $status: String, $notes: String) {
        updateClientMembership(input: { id: $id, status: $status, notes: $notes }) {
          clientMembership { id status cancelledAt notes }
          errors
        }
      }
    GRAPHQL
  end

  # ─── membershipPlans query ────────────────────────────────────────────────────

  describe "membershipPlans query" do
    before do
      create(:membership_plan, :published, studio: studio, name: "Essential",  price_cents: 13_900)
      create(:membership_plan, :published, studio: studio, name: "Signature",  price_cents: 22_900)
      create(:membership_plan,             studio: studio, name: "Draft Plan")
    end

    it "returns all plans (published + draft) for owner" do
      sign_in(owner)
      json = graphql_post(query: plans_query)

      expect(json["errors"]).to be_nil
      plans = json.dig("data", "membershipPlans")
      expect(plans.length).to eq(3)
    end

    it "returns only published plans for a client" do
      sign_in(client_user)
      json = graphql_post(query: plans_query)

      plans = json.dig("data", "membershipPlans")
      expect(plans.length).to eq(2)
      expect(plans.map { |p| p["active"] }).to all(eq(true))
    end

    it "returns correct price for plans" do
      sign_in(owner)
      json = graphql_post(query: plans_query)
      prices = json.dig("data", "membershipPlans").map { |p| p["priceCents"] }
      expect(prices).to include(13_900, 22_900)
    end

    it "returns enrolledCount of 0 for a fresh plan" do
      sign_in(owner)
      json  = graphql_post(query: plans_query)
      plans = json.dig("data", "membershipPlans")
      expect(plans.map { |p| p["enrolledCount"] }).to all(eq(0))
    end

    it "requires authentication" do
      json = graphql_post(query: plans_query)
      expect(json["errors"]).not_to be_nil
    end
  end

  # ─── clientMemberships query ──────────────────────────────────────────────────

  describe "clientMemberships query" do
    let(:plan)   { create(:membership_plan, studio: studio) }
    let(:client) { create(:client, studio: studio) }

    before do
      create(:client_membership, :active,    client: client, membership_plan: plan, studio: studio)
      create(:client_membership, :cancelled, client: client, membership_plan: plan, studio: studio)
    end

    it "returns all memberships for owner" do
      sign_in(owner)
      json = graphql_post(query: enrollments_query)

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "clientMemberships").length).to eq(2)
    end

    it "filters by status" do
      sign_in(owner)
      json = graphql_post(query: enrollments_query, variables: { status: "active" })

      members = json.dig("data", "clientMemberships")
      expect(members.length).to eq(1)
      expect(members.first["status"]).to eq("active")
    end

    it "denies unauthenticated access" do
      json = graphql_post(query: enrollments_query)
      expect(json["errors"]).not_to be_nil
    end
  end

  # ─── createMembershipPlan mutation ───────────────────────────────────────────

  describe "createMembershipPlan mutation" do
    let(:valid_vars) do
      {
        name: "Essential Membership",
        priceCents: 13_900,
        currency: "cad",
        reformerClassesPerMonth: 4,
        minCommitmentMonths: 3,
        active: false
      }
    end

    it "allows owner to create a plan" do
      sign_in(owner)
      json = graphql_post(query: create_plan_mutation, variables: valid_vars)

      payload = json.dig("data", "createMembershipPlan")
      expect(payload["errors"]).to eq([])
      expect(payload.dig("membershipPlan", "name")).to eq("Essential Membership")
      expect(payload.dig("membershipPlan", "priceCents")).to eq(13_900)
      expect(payload.dig("membershipPlan", "active")).to eq(false)
      expect(payload.dig("membershipPlan", "enrolledCount")).to eq(0)
    end

    it "allows staff to create a plan" do
      sign_in(staff)
      json    = graphql_post(query: create_plan_mutation, variables: valid_vars)
      payload = json.dig("data", "createMembershipPlan")
      expect(payload["errors"]).to eq([])
      expect(payload.dig("membershipPlan", "id")).to be_present
    end

    it "rejects creation by a client user" do
      sign_in(client_user)
      json    = graphql_post(query: create_plan_mutation, variables: valid_vars)
      payload = json.dig("data", "createMembershipPlan")
      # Pundit raises → ExecutionError returned in errors key
      expect(json["errors"] || payload["errors"]).not_to be_empty
    end

    it "rejects invalid price_cents" do
      sign_in(owner)
      json    = graphql_post(query: create_plan_mutation, variables: valid_vars.merge(priceCents: -100))
      payload = json.dig("data", "createMembershipPlan")
      expect(payload["errors"]).not_to be_empty
    end

    it "persists the plan to the database" do
      sign_in(owner)
      expect {
        graphql_post(query: create_plan_mutation, variables: valid_vars)
      }.to change(MembershipPlan, :count).by(1)
    end

    it "requires authentication" do
      json = graphql_post(query: create_plan_mutation, variables: valid_vars)
      expect(json["errors"]).not_to be_nil
    end
  end

  # ─── updateMembershipPlan mutation ───────────────────────────────────────────

  describe "updateMembershipPlan mutation" do
    let(:plan) { create(:membership_plan, studio: studio, name: "Old Name", price_cents: 10_000) }

    it "owner can rename a plan" do
      sign_in(owner)
      json    = graphql_post(query: update_plan_mutation, variables: { id: plan.id.to_s, name: "New Name" })
      payload = json.dig("data", "updateMembershipPlan")
      expect(payload["errors"]).to eq([])
      expect(payload.dig("membershipPlan", "name")).to eq("New Name")
    end

    it "owner can publish (activate) a plan" do
      sign_in(owner)
      json    = graphql_post(query: update_plan_mutation, variables: { id: plan.id.to_s, active: true })
      payload = json.dig("data", "updateMembershipPlan")
      expect(payload.dig("membershipPlan", "active")).to eq(true)
    end

    it "owner can update price" do
      sign_in(owner)
      json    = graphql_post(query: update_plan_mutation, variables: { id: plan.id.to_s, priceCents: 29_900 })
      payload = json.dig("data", "updateMembershipPlan")
      expect(payload.dig("membershipPlan", "priceCents")).to eq(29_900)
    end

    it "returns error for plan belonging to another studio" do
      other_studio = create(:studio)
      other_plan   = create(:membership_plan, studio: other_studio)
      sign_in(owner)

      json    = graphql_post(query: update_plan_mutation, variables: { id: other_plan.id.to_s, name: "Hijack" })
      payload = json.dig("data", "updateMembershipPlan")
      expect(payload["errors"]).to include("Membership plan not found")
    end

    it "denies update by a client user" do
      sign_in(client_user)
      json = graphql_post(query: update_plan_mutation, variables: { id: plan.id.to_s, name: "Nope" })
      expect(json["errors"] || json.dig("data", "updateMembershipPlan", "errors")).not_to be_empty
    end
  end

  # ─── deleteMembershipPlan mutation ───────────────────────────────────────────

  describe "deleteMembershipPlan mutation" do
    let!(:plan) { create(:membership_plan, studio: studio) }

    it "owner can delete an empty plan" do
      sign_in(owner)
      expect {
        json = graphql_post(query: delete_plan_mutation, variables: { id: plan.id.to_s })
        expect(json.dig("data", "deleteMembershipPlan", "success")).to eq(true)
      }.to change(MembershipPlan, :count).by(-1)
    end

    it "cannot delete a plan that has enrolled clients" do
      client = create(:client, studio: studio)
      create(:client_membership, :active, client: client, membership_plan: plan, studio: studio)
      sign_in(owner)

      json    = graphql_post(query: delete_plan_mutation, variables: { id: plan.id.to_s })
      payload = json.dig("data", "deleteMembershipPlan")
      expect(payload["success"]).to eq(false)
      expect(payload["errors"].first).to include("enrolled clients")
    end

    it "returns error for nonexistent plan" do
      sign_in(owner)
      json    = graphql_post(query: delete_plan_mutation, variables: { id: "99999" })
      payload = json.dig("data", "deleteMembershipPlan")
      expect(payload["success"]).to eq(false)
      expect(payload["errors"]).not_to be_empty
    end
  end

  # ─── enrollClientMembership mutation ─────────────────────────────────────────

  describe "enrollClientMembership mutation" do
    let(:plan)   { create(:membership_plan, studio: studio) }
    let(:client) { create(:client, studio: studio) }

    let(:enroll_vars) do
      {
        clientId: client.id.to_s,
        membershipPlanId: plan.id.to_s,
        startedAt: Date.today.iso8601
      }
    end

    it "owner can enroll a client" do
      sign_in(owner)
      json    = graphql_post(query: enroll_mutation, variables: enroll_vars)
      payload = json.dig("data", "enrollClientMembership")

      expect(payload["errors"]).to eq([])
      expect(payload.dig("clientMembership", "status")).to eq("active")
      expect(payload.dig("clientMembership", "startedAt")).to be_present
    end

    it "creates a ClientMembership record" do
      sign_in(owner)
      expect {
        graphql_post(query: enroll_mutation, variables: enroll_vars)
      }.to change(ClientMembership, :count).by(1)
    end

    it "prevents duplicate active enrollment in the same plan" do
      create(:client_membership, :active, client: client, membership_plan: plan, studio: studio)
      sign_in(owner)

      json    = graphql_post(query: enroll_mutation, variables: enroll_vars)
      payload = json.dig("data", "enrollClientMembership")
      expect(payload["errors"]).to include(a_string_matching(/already has an active membership/))
    end

    it "rejects a client from another studio" do
      other_studio = create(:studio)
      other_client = create(:client, studio: other_studio)
      sign_in(owner)

      json    = graphql_post(query: enroll_mutation,
                             variables: enroll_vars.merge(clientId: other_client.id.to_s))
      payload = json.dig("data", "enrollClientMembership")
      expect(payload["errors"]).to include("Client not found")
    end

    it "denies enrollment by a client user" do
      sign_in(client_user)
      json = graphql_post(query: enroll_mutation, variables: enroll_vars)
      expect(json["errors"] || json.dig("data", "enrollClientMembership", "errors")).not_to be_empty
    end

    it "requires authentication" do
      json = graphql_post(query: enroll_mutation, variables: enroll_vars)
      expect(json["errors"]).not_to be_nil
    end
  end

  # ─── updateClientMembership mutation ─────────────────────────────────────────

  describe "updateClientMembership mutation" do
    let(:plan)       { create(:membership_plan, studio: studio) }
    let(:client)     { create(:client, studio: studio) }
    let!(:membership) do
      create(:client_membership, :active, client: client, membership_plan: plan, studio: studio)
    end

    it "owner can pause an active membership" do
      sign_in(owner)
      json    = graphql_post(query: update_enrollment_mutation,
                             variables: { id: membership.id.to_s, status: "paused" })
      payload = json.dig("data", "updateClientMembership")
      expect(payload["errors"]).to eq([])
      expect(payload.dig("clientMembership", "status")).to eq("paused")
    end

    it "owner can cancel a membership and records cancelled_at" do
      sign_in(owner)
      json    = graphql_post(query: update_enrollment_mutation,
                             variables: { id: membership.id.to_s, status: "cancelled" })
      payload = json.dig("data", "updateClientMembership")
      expect(payload.dig("clientMembership", "status")).to eq("cancelled")
      expect(payload.dig("clientMembership", "cancelledAt")).not_to be_nil
    end

    it "owner can reactivate a cancelled membership and clears cancelled_at" do
      membership.update!(status: "cancelled", cancelled_at: 1.day.ago)
      sign_in(owner)
      json    = graphql_post(query: update_enrollment_mutation,
                             variables: { id: membership.id.to_s, status: "active" })
      payload = json.dig("data", "updateClientMembership")
      expect(payload.dig("clientMembership", "status")).to eq("active")
      expect(payload.dig("clientMembership", "cancelledAt")).to be_nil
    end

    it "owner can update notes" do
      sign_in(owner)
      json    = graphql_post(query: update_enrollment_mutation,
                             variables: { id: membership.id.to_s, notes: "3-month commitment waived" })
      payload = json.dig("data", "updateClientMembership")
      expect(payload.dig("clientMembership", "notes")).to eq("3-month commitment waived")
    end

    it "rejects an invalid status" do
      sign_in(owner)
      json    = graphql_post(query: update_enrollment_mutation,
                             variables: { id: membership.id.to_s, status: "magic" })
      payload = json.dig("data", "updateClientMembership")
      expect(payload["errors"]).not_to be_empty
    end

    it "cannot update a membership belonging to another studio" do
      other_studio     = create(:studio)
      other_plan       = create(:membership_plan, studio: other_studio)
      other_client     = create(:client, studio: other_studio)
      other_membership = create(:client_membership, :active,
                                client: other_client, membership_plan: other_plan, studio: other_studio)
      sign_in(owner)

      json    = graphql_post(query: update_enrollment_mutation,
                             variables: { id: other_membership.id.to_s, status: "cancelled" })
      payload = json.dig("data", "updateClientMembership")
      expect(payload["errors"]).to include("Membership not found")
    end

    it "denies update by a client user" do
      sign_in(client_user)
      json = graphql_post(query: update_enrollment_mutation,
                          variables: { id: membership.id.to_s, status: "cancelled" })
      expect(json["errors"] || json.dig("data", "updateClientMembership", "errors")).not_to be_empty
    end
  end
end
