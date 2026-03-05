require "rails_helper"

RSpec.describe "Toggle client block", type: :request do
  let(:studio)     { create(:studio) }
  let(:owner)      { create(:user, :owner, studio: studio) }
  let(:staff)      { create(:user, :staff, studio: studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:client)     { create(:client, studio: studio) }

  let(:mutation) do
    <<~GRAPHQL
      mutation($clientId: ID!, $blocked: Boolean!) {
        toggleClientBlock(input: { clientId: $clientId, blocked: $blocked }) {
          client { id }
          blocked
          errors
        }
      }
    GRAPHQL
  end

  # ─────────────────────────────────────────────────────────────────────────
  # Blocking
  # ─────────────────────────────────────────────────────────────────────────
  describe "blocking a client" do
    it "lets an instructor block a client" do
      sign_in(instructor)

      json    = graphql_post(query: mutation, variables: { clientId: client.id.to_s, blocked: true })
      payload = json.dig("data", "toggleClientBlock")

      expect(payload["errors"]).to be_empty
      expect(payload["blocked"]).to be true
      expect(
        InstructorClientBlock.exists?(studio_id: studio.id, instructor_id: instructor.id, client_id: client.id)
      ).to be true
    end

    it "lets an owner block a client" do
      sign_in(owner)

      json    = graphql_post(query: mutation, variables: { clientId: client.id.to_s, blocked: true })
      payload = json.dig("data", "toggleClientBlock")

      expect(payload["errors"]).to be_empty
      expect(payload["blocked"]).to be true
    end

    it "lets staff block a client" do
      sign_in(staff)

      json    = graphql_post(query: mutation, variables: { clientId: client.id.to_s, blocked: true })
      payload = json.dig("data", "toggleClientBlock")

      expect(payload["errors"]).to be_empty
      expect(payload["blocked"]).to be true
    end

    it "is idempotent — blocking an already-blocked client does not error" do
      InstructorClientBlock.create!(studio_id: studio.id, instructor_id: instructor.id, client_id: client.id)
      sign_in(instructor)

      json    = graphql_post(query: mutation, variables: { clientId: client.id.to_s, blocked: true })
      payload = json.dig("data", "toggleClientBlock")

      expect(payload["errors"]).to be_empty
      expect(payload["blocked"]).to be true
      expect(
        InstructorClientBlock.where(instructor_id: instructor.id, client_id: client.id).count
      ).to eq(1)
    end
  end

  # ─────────────────────────────────────────────────────────────────────────
  # Unblocking
  # ─────────────────────────────────────────────────────────────────────────
  describe "unblocking a client" do
    before do
      InstructorClientBlock.create!(studio_id: studio.id, instructor_id: instructor.id, client_id: client.id)
    end

    it "lets an instructor unblock a client they previously blocked" do
      sign_in(instructor)

      json    = graphql_post(query: mutation, variables: { clientId: client.id.to_s, blocked: false })
      payload = json.dig("data", "toggleClientBlock")

      expect(payload["errors"]).to be_empty
      expect(payload["blocked"]).to be false
      expect(
        InstructorClientBlock.exists?(instructor_id: instructor.id, client_id: client.id)
      ).to be false
    end

    it "is idempotent — unblocking an already-unblocked client does not error" do
      InstructorClientBlock.where(instructor_id: instructor.id, client_id: client.id).destroy_all
      sign_in(instructor)

      json    = graphql_post(query: mutation, variables: { clientId: client.id.to_s, blocked: false })
      payload = json.dig("data", "toggleClientBlock")

      expect(payload["errors"]).to be_empty
      expect(payload["blocked"]).to be false
    end
  end

  # ─────────────────────────────────────────────────────────────────────────
  # Authorization checks
  # ─────────────────────────────────────────────────────────────────────────
  describe "authorization" do
    it "rejects unauthenticated callers" do
      json    = graphql_post(query: mutation, variables: { clientId: client.id.to_s, blocked: true })
      payload = json.dig("data", "toggleClientBlock")

      expect(payload["errors"]).to be_present
      expect(payload["errors"].join).to match(/not authorized/i)
    end

    it "rejects a client user from blocking another client" do
      client_user = create(:user, :client, studio: studio)
      sign_in(client_user)

      json    = graphql_post(query: mutation, variables: { clientId: client.id.to_s, blocked: true })
      payload = json.dig("data", "toggleClientBlock")

      expect(payload["errors"]).to be_present
      expect(payload["errors"].join).to match(/not authorized/i)
    end

    it "returns not_found for a client in another studio" do
      other_studio = create(:studio)
      other_client = create(:client, studio: other_studio)
      sign_in(instructor)

      json    = graphql_post(query: mutation, variables: { clientId: other_client.id.to_s, blocked: true })
      payload = json.dig("data", "toggleClientBlock")

      expect(payload["client"]).to be_nil
      expect(payload["errors"].join).to match(/not found/i)
    end
  end

  # ─────────────────────────────────────────────────────────────────────────
  # Booking flow integration: blocked client cannot book the instructor's class
  # ─────────────────────────────────────────────────────────────────────────
  describe "booking rejection after block" do
    let(:template) { create(:class_template, instructor: instructor) }
    let(:session)  { create(:class_session, class_template: template, instructor: instructor) }

    let(:create_booking_mutation) do
      <<~GRAPHQL
        mutation($input: CreateBookingInput!) {
          createBooking(input: $input) {
            booking { id }
            errors
          }
        }
      GRAPHQL
    end

    it "prevents a blocked client from being booked into the instructor's session" do
      # First block the client as instructor
      sign_in(instructor)
      graphql_post(query: mutation, variables: { clientId: client.id.to_s, blocked: true })

      # Then try to book as staff
      sign_in(staff)
      json    = graphql_post(
        query: create_booking_mutation,
        variables: { input: { classSessionId: session.id.to_s, clientId: client.id.to_s } }
      )
      errors = json.dig("data", "createBooking", "errors")

      expect(errors).to be_present
      expect(errors.join).to match(/blocked/i)
    end
  end
end
