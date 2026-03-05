require "rails_helper"

RSpec.describe "Booking actions", type: :request do
  let(:studio)       { create(:studio) }
  let(:owner)        { create(:user, :owner, studio: studio) }
  let(:staff)        { create(:user, :staff, studio: studio) }
  let(:instructor)   { create(:user, :instructor, studio: studio) }
  let(:client_user)  { create(:user, :client, studio: studio) }

  let(:template) { create(:class_template, instructor: instructor, price_cents: 5_000, currency: "cad") }
  let(:session)  { create(:class_session, class_template: template, instructor: instructor) }
  let(:client)   { create(:client, studio: studio, user: client_user) }

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
  # markNoShowBooking
  # ─────────────────────────────────────────────────────────────────────────
  describe "markNoShowBooking mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($id: ID!) {
          markNoShowBooking(input: { id: $id }) {
            success
            errors
          }
        }
      GRAPHQL
    end

    it "allows staff to mark a booked session as no-show" do
      booking = create(:booking, client: client, class_session: session, status: "booked")
      sign_in(staff)

      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "markNoShowBooking")

      expect(payload["success"]).to be true
      expect(payload["errors"]).to be_empty
      expect(booking.reload.status).to eq("no_show")
    end

    it "allows owner to mark a booking as no-show" do
      booking = create(:booking, client: client, class_session: session, status: "booked")
      sign_in(owner)

      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "markNoShowBooking")

      expect(payload["success"]).to be true
      expect(booking.reload.status).to eq("no_show")
    end

    it "allows instructor to mark a no-show for their own class" do
      booking = create(:booking, client: client, class_session: session, status: "booked")
      sign_in(instructor)

      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "markNoShowBooking")

      expect(payload["success"]).to be true
      expect(booking.reload.status).to eq("no_show")
    end

    it "returns an error when booking is already cancelled" do
      booking = create(:booking, client: client, class_session: session, status: "cancelled")
      sign_in(staff)

      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "markNoShowBooking")

      expect(payload["success"]).to be false
      expect(payload["errors"].join).to match(/already cancelled/i)
    end

    it "returns not_found for an unknown booking id" do
      sign_in(staff)
      json    = graphql_post(query: mutation, variables: { id: "999999" })
      payload = json.dig("data", "markNoShowBooking")

      expect(payload["success"]).to be false
      expect(payload["errors"].join).to match(/not found/i)
    end

    it "rejects unauthenticated callers" do
      booking = create(:booking, client: client, class_session: session)
      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "markNoShowBooking")

      expect(payload["success"]).to be false
    end
  end

  # ─────────────────────────────────────────────────────────────────────────
  # archiveBooking
  # ─────────────────────────────────────────────────────────────────────────
  describe "archiveBooking mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($id: ID!) {
          archiveBooking(input: { id: $id }) {
            success
            errors
          }
        }
      GRAPHQL
    end

    it "allows staff to archive a booking" do
      booking = create(:booking, client: client, class_session: session, status: "cancelled")
      sign_in(staff)

      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "archiveBooking")

      expect(payload["success"]).to be true
      expect(payload["errors"]).to be_empty
      expect(booking.reload.archived).to be true
    end

    it "allows owner to archive a booking" do
      booking = create(:booking, client: client, class_session: session)
      sign_in(owner)

      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "archiveBooking")

      expect(payload["success"]).to be true
    end

    it "rejects a client user archiving a booking they don't own" do
      other_client = create(:client, studio: studio)
      other_user   = create(:user, :client, studio: studio)
      booking      = create(:booking, client: other_client, class_session: session)
      sign_in(other_user)

      json = graphql_post(query: mutation, variables: { id: booking.id.to_s })

      # Pundit raises NotAuthorizedError → GraphQL::ExecutionError in json["errors"]
      expect(json["errors"]).to be_present
      expect(json["errors"].first["message"]).to match(/not authorized/i)
    end

    it "returns not_found for a booking in another studio" do
      other_studio = create(:studio)
      other_client = create(:client, studio: other_studio)
      other_sess   = create(:class_session, class_template: create(:class_template, instructor: create(:user, :instructor, studio: other_studio)))
      other_booking = create(:booking, client: other_client, class_session: other_sess)
      sign_in(staff)

      json    = graphql_post(query: mutation, variables: { id: other_booking.id.to_s })
      payload = json.dig("data", "archiveBooking")

      expect(payload["success"]).to be false
    end
  end

  # ─────────────────────────────────────────────────────────────────────────
  # rebookBooking (free rebook, no payment)
  # ─────────────────────────────────────────────────────────────────────────
  describe "rebookBooking mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($id: ID!) {
          rebookBooking(input: { id: $id }) {
            booking { id status archived }
            errors
          }
        }
      GRAPHQL
    end

    it "allows staff to rebook a cancelled booking" do
      booking = create(:booking, client: client, class_session: session, status: "cancelled", archived: true)
      sign_in(staff)

      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "rebookBooking")

      expect(payload["errors"]).to be_empty
      expect(payload.dig("booking", "status")).to eq("booked").or eq("waitlisted")
      expect(payload.dig("booking", "archived")).to be false
      expect(NotificationJob).to have_received(:perform_now).with(:booking_confirmation, booking.id)
    end

    it "allows owner to rebook a cancelled booking" do
      booking = create(:booking, client: client, class_session: session, status: "cancelled")
      sign_in(owner)

      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "rebookBooking")

      expect(payload["errors"]).to be_empty
      expect(payload.dig("booking", "status")).to be_present
    end

    it "returns an error when booking is not cancelled" do
      booking = create(:booking, client: client, class_session: session, status: "booked")
      sign_in(staff)

      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "rebookBooking")

      expect(payload["booking"]).to be_nil
      expect(payload["errors"].join).to match(/cancelled/i)
    end

    it "blocks rebook when instructor has blocked the client" do
      booking = create(:booking, client: client, class_session: session, status: "cancelled")
      create(:instructor_client_block, instructor: instructor, client: client, studio: studio)
      sign_in(staff)

      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "rebookBooking")

      expect(payload["booking"]).to be_nil
      expect(payload["errors"].join).to match(/blocked/i)
    end

    it "waitlists when session is full at time of rebook" do
      full_template = create(:class_template, instructor: instructor, capacity: 1)
      full_session  = create(:class_session, class_template: full_template, instructor: instructor)
      other_client  = create(:client, studio: studio)
      create(:booking, client: other_client, class_session: full_session, status: "booked")

      booking = create(:booking, client: client, class_session: full_session, status: "cancelled")
      sign_in(staff)

      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "rebookBooking")

      expect(payload["errors"]).to be_empty
      expect(payload.dig("booking", "status")).to eq("waitlisted")
    end
  end

  # ─────────────────────────────────────────────────────────────────────────
  # rebookBookingWithPayment (paid rebook)
  # ─────────────────────────────────────────────────────────────────────────
  describe "rebookBookingWithPayment mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($id: ID!, $paymentMethodId: String) {
          rebookBookingWithPayment(input: { id: $id, paymentMethodId: $paymentMethodId }) {
            booking { id status paid }
            payment { id status amountCents stripePaymentIntentId }
            errors
          }
        }
      GRAPHQL
    end

    it "rebooks and charges Stripe when payment succeeds" do
      priced_template = create(:class_template, instructor: instructor, price_cents: 5_000, currency: "cad")
      priced_session  = create(:class_session, class_template: priced_template, instructor: instructor)
      booking = create(:booking, client: client, class_session: priced_session, status: "cancelled")

      intent = double("Stripe::PaymentIntent", status: "succeeded", id: "pi_rebook_1", to_hash: { "id" => "pi_rebook_1" })
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

      sign_in(staff)
      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s, paymentMethodId: "pm_test" })
      payload = json.dig("data", "rebookBookingWithPayment")

      expect(payload["errors"]).to be_empty
      expect(payload.dig("booking", "paid")).to be true
      expect(payload.dig("payment", "stripePaymentIntentId")).to eq("pi_rebook_1")
      expect(NotificationJob).to have_received(:perform_now)
    end

    it "returns an error when Stripe payment fails" do
      priced_template = create(:class_template, instructor: instructor, price_cents: 5_000, currency: "cad")
      priced_session  = create(:class_session, class_template: priced_template, instructor: instructor)
      booking = create(:booking, client: client, class_session: priced_session, status: "cancelled")

      intent = double("Stripe::PaymentIntent", status: "requires_payment_method", id: "pi_fail", to_hash: {})
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

      sign_in(staff)
      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s, paymentMethodId: "pm_test" })
      payload = json.dig("data", "rebookBookingWithPayment")

      expect(payload["booking"]).to be_nil
      expect(payload["errors"].join).to match(/payment did not succeed/i)
    end

    it "returns an error when no payment method is provided and client has no default" do
      priced_template = create(:class_template, instructor: instructor, price_cents: 5_000, currency: "cad")
      priced_session  = create(:class_session, class_template: priced_template, instructor: instructor)
      booking = create(:booking, client: client, class_session: priced_session, status: "cancelled")

      sign_in(staff)
      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "rebookBookingWithPayment")

      expect(payload["booking"]).to be_nil
      expect(payload["errors"].join).to match(/no payment method/i)
    end

    it "uses client's default payment method when none is explicitly provided" do
      client_with_pm = create(:client, studio: studio, stripe_default_payment_method_id: "pm_default")
      priced_template = create(:class_template, instructor: instructor, price_cents: 5_000, currency: "cad")
      priced_session  = create(:class_session, class_template: priced_template, instructor: instructor)
      booking = create(:booking, client: client_with_pm, class_session: priced_session, status: "cancelled")

      intent = double("Stripe::PaymentIntent", status: "succeeded", id: "pi_default", to_hash: { "id" => "pi_default" })
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

      sign_in(staff)
      json    = graphql_post(query: mutation, variables: { id: booking.id.to_s })
      payload = json.dig("data", "rebookBookingWithPayment")

      expect(payload["errors"]).to be_empty
      expect(payload.dig("booking", "paid")).to be true
    end

    it "returns an error when booking belongs to a different studio" do
      other_studio = create(:studio)
      other_client = create(:client, studio: other_studio)
      other_instr  = create(:user, :instructor, studio: other_studio)
      other_tmpl   = create(:class_template, instructor: other_instr, price_cents: 5_000)
      other_sess   = create(:class_session, class_template: other_tmpl, instructor: other_instr)
      other_booking = create(:booking, client: other_client, class_session: other_sess, status: "cancelled")

      sign_in(staff)
      json    = graphql_post(query: mutation, variables: { id: other_booking.id.to_s, paymentMethodId: "pm_test" })
      payload = json.dig("data", "rebookBookingWithPayment")

      expect(payload["errors"]).not_to be_empty
    end
  end
end
