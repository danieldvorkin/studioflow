require "rails_helper"

RSpec.describe "Booking lifecycle", type: :request do
  let(:studio) { create(:studio) }
  let(:owner) { create(:user, :owner, studio: studio) }
  let(:staff) { create(:user, :staff, studio: studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:client_user) { create(:user, :client, studio: studio) }

  let(:client) { create(:client, studio: studio, user: client_user) }
  let(:template) { create(:class_template, instructor: instructor, capacity: 1) }
  let(:session) { create(:class_session, class_template: template, instructor: instructor) }

  describe "createBooking" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($input: CreateBookingInput!) {
          createBooking(input: $input) {
            booking { id status archived }
            errors
          }
        }
      GRAPHQL
    end

    it "lets staff create a booking" do
      sign_in(staff)
      json = graphql_post(query: mutation, variables: { input: { classSessionId: session.id, clientId: client.id } })

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "createBooking", "errors")).to be_blank
      status = json.dig("data", "createBooking", "booking", "status")
      expect(status).to be_present
    end

    it "lets client user create a booking for themselves" do
      sign_in(client_user)
      json = graphql_post(query: mutation, variables: { input: { classSessionId: session.id, clientId: client.id } })

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "createBooking", "errors")).to be_blank
      expect(json.dig("data", "createBooking", "booking", "id")).to be_present
    end

    it "rejects unauthenticated" do
      json = graphql_post(query: mutation, variables: { input: { classSessionId: session.id, clientId: client.id } })

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "createBooking", "booking")).to be_nil
      expect(json.dig("data", "createBooking", "errors")).to include("Not authenticated")
    end

    it "waitlists when capacity reached" do
      sign_in(staff)

      create(:booking, class_session: session, client: create(:client, studio: studio))
      json = graphql_post(query: mutation, variables: { input: { classSessionId: session.id, clientId: client.id } })

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "createBooking", "errors")).to be_blank

      booking_id = json.dig("data", "createBooking", "booking", "id").to_i
      booking = Booking.find(booking_id)
      expect(booking.status).to eq("waitlisted")
    end

    it "rejects when instructor blocks client" do
      create(:instructor_client_block, instructor: instructor, client: client)
      sign_in(staff)

      json = graphql_post(query: mutation, variables: { input: { classSessionId: session.id, clientId: client.id } })

      expect(json["errors"]).to be_nil
      errors = json.dig("data", "createBooking", "errors")
      expect(errors).to be_present
    end
  end

  describe "cancelBooking" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($input: CancelBookingInput!) {
          cancelBooking(input: $input) {
            success
            errors
          }
        }
      GRAPHQL
    end

    it "allows staff to cancel the booking" do
      booking = create(:booking, class_session: session, client: client, status: "booked")

      sign_in(staff)
      json = graphql_post(query: mutation, variables: { input: { id: booking.id } })

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "cancelBooking", "errors")).to be_blank
      expect(json.dig("data", "cancelBooking", "success")).to eq(true)

      booking.reload
      expect(booking.status).to eq("cancelled")
    end

    it "promotes earliest waitlist booking when a booked spot opens" do
      booked = create(:booking, class_session: session, client: create(:client, studio: studio), status: "booked")
      waitlisted1 = create(:booking, class_session: session, client: create(:client, studio: studio), status: "waitlisted", created_at: 2.minutes.ago)
      waitlisted2 = create(:booking, class_session: session, client: create(:client, studio: studio), status: "waitlisted", created_at: 1.minute.ago)

      sign_in(staff)
      json = graphql_post(query: mutation, variables: { input: { id: booked.id } })

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "cancelBooking", "errors")).to be_blank
      expect(json.dig("data", "cancelBooking", "success")).to eq(true)

      waitlisted1.reload
      waitlisted2.reload
      expect(waitlisted1.status).to eq("booked")
      expect(waitlisted2.status).to eq("waitlisted")
    end

    it "allows client user to cancel their own booking" do
      booking = create(:booking, class_session: session, client: client, status: "booked")

      sign_in(client_user)
      json = graphql_post(query: mutation, variables: { input: { id: booking.id } })

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "cancelBooking", "errors")).to be_blank
      expect(json.dig("data", "cancelBooking", "success")).to eq(true)

      booking.reload
      expect(booking.status).to eq("cancelled")
    end

    it "rejects client user cancelling someone else's booking" do
      other_client = create(:client, studio: studio)
      other_booking = create(:booking, class_session: session, client: other_client, status: "booked")

      sign_in(client_user)
      json = graphql_post(query: mutation, variables: { input: { id: other_booking.id } })

      expect(json.dig("data", "cancelBooking")).to be_nil
      expect(json["errors"]).to be_present
      expect(json["errors"].first["message"]).to match(/not authorized/i)
    end

    it "handles missing booking id" do
      sign_in(staff)
      json = graphql_post(query: mutation, variables: { input: { id: -1 } })

      expect(json.dig("data", "cancelBooking")).to be_nil
      expect(response.status).to eq(404)
    end
  end

  describe "bookings query" do
    let(:query) do
      <<~GRAPHQL
        query {
          bookings { id status archived }
        }
      GRAPHQL
    end

    it "allows staff to view all bookings" do
      create(:booking, class_session: session, client: create(:client, studio: studio))
      create(:booking, class_session: session, client: create(:client, studio: studio))

      sign_in(staff)
      json = graphql_post(query: query)

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "bookings").length).to be >= 2
    end

    it "rejects instructor" do
      other_studio = create(:studio)
      other_instructor = create(:user, :instructor, studio: other_studio)

      my_template = create(:class_template, instructor: instructor)
      other_template = create(:class_template, instructor: other_instructor)

      my_session = create(:class_session, class_template: my_template, instructor: instructor)
      other_session = create(:class_session, class_template: other_template, instructor: other_instructor, room: 'Room B')

      my_booking = create(:booking, class_session: my_session, client: create(:client, studio: studio))
      other_booking = create(:booking, class_session: other_session, client: create(:client, studio: other_studio))

      sign_in(instructor)
      json = graphql_post(query: query)

      expect(json["errors"]).to be_nil
      returned_ids = json.dig("data", "bookings").map { |b| b["id"].to_i }
      expect(returned_ids).to include(my_booking.id)
      expect(returned_ids).not_to include(other_booking.id)
    end
  end
end
