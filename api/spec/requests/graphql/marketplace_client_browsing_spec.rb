require "rails_helper"

RSpec.describe "Marketplace client browsing", type: :request do
  let(:studio_a) { create(:studio, name: "Studio A") }
  let(:studio_b) { create(:studio, name: "Studio B") }

  let(:client_user) { create(:user, :client, studio: studio_a) }

  describe "studios query" do
    let(:query) do
      <<~GRAPHQL
        query {
          studios { id name }
        }
      GRAPHQL
    end

    it "lists studios for an authenticated user" do
      studio_a
      studio_b

      sign_in(client_user)
      json = graphql_post(query: query)

      expect(json["errors"]).to be_nil
      names = json.dig("data", "studios").map { |s| s["name"] }
      expect(names).to include("Studio A", "Studio B")
    end
  end

  describe "studioLocations query" do
    let(:query) do
      <<~GRAPHQL
        query($studioId: ID) {
          studioLocations(studioId: $studioId) { id name }
        }
      GRAPHQL
    end

    it "allows a client user to fetch locations for a selected studio" do
      loc_a = create(:studio_location, studio: studio_a, name: "A")
      loc_b = create(:studio_location, studio: studio_b, name: "B")

      sign_in(client_user)
      json = graphql_post(query: query, variables: { studioId: studio_b.id })

      expect(json["errors"]).to be_nil
      ids = json.dig("data", "studioLocations").map { |l| l["id"].to_i }
      expect(ids).to include(loc_b.id)
      expect(ids).not_to include(loc_a.id)
    end
  end

  describe "createBooking mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($input: CreateBookingInput!) {
          createBooking(input: $input) {
            booking { id status }
            errors
          }
        }
      GRAPHQL
    end

    it "creates studio membership on first booking when a client books another studio" do
      instructor_b = create(:user, :instructor, studio: studio_b)
      template_b = create(:class_template, studio: studio_b, instructor: instructor_b)
      session_b = create(:class_session, studio: studio_b, class_template: template_b, instructor: instructor_b)

      sign_in(client_user)
      json = graphql_post(query: mutation, variables: { input: { classSessionId: session_b.id } })

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "createBooking", "errors")).to be_blank

      booking_id = json.dig("data", "createBooking", "booking", "id").to_i
      booking = Booking.find(booking_id)
      expect(booking.studio_id).to eq(studio_b.id)
      expect(booking.client.user_id).to eq(client_user.id)
      expect(booking.client.studio_id).to eq(studio_b.id)
    end
  end

  describe "paymentPublicSettings query" do
    let(:query) do
      <<~GRAPHQL
        query($studioId: ID) {
          paymentPublicSettings(studioId: $studioId) {
            stripePublishableKey
            enabled
            configured
          }
        }
      GRAPHQL
    end

    it "returns public Stripe settings for the selected studio" do
      PaymentSetting.delete_all
      PaymentSetting.instance_for(studio_b).update!(
        enabled: true,
        stripe_publishable_key: "pk_test_b",
        stripe_secret_key: "sk_test_b",
        default_currency: "cad"
      )

      sign_in(client_user)
      json = graphql_post(query: query, variables: { studioId: studio_b.id })

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "paymentPublicSettings", "stripePublishableKey")).to eq("pk_test_b")
      expect(json.dig("data", "paymentPublicSettings", "configured")).to eq(true)
    end
  end

  describe "studioSettings query" do
    let(:query) do
      <<~GRAPHQL
        query($studioId: ID) {
          studioSettings(studioId: $studioId) {
            dashboardTitle
            defaultTheme
            clientsPageEnabled
          }
        }
      GRAPHQL
    end

    it "returns UI settings for the selected studio" do
      sign_in(client_user)
      json = graphql_post(query: query, variables: { studioId: studio_b.id })

      expect(json["errors"]).to be_nil
      settings = json.dig("data", "studioSettings")
      expect(settings["dashboardTitle"]).to be_present
      expect(settings["defaultTheme"]).to be_present
      expect(settings["clientsPageEnabled"]).not_to be_nil
    end
  end
end
