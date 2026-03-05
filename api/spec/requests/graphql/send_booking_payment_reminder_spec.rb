require "rails_helper"

RSpec.describe "sendBookingPaymentReminder mutation", type: :request do
  let(:mutation) do
    <<~GRAPHQL
      mutation($bookingId: ID!) {
        sendBookingPaymentReminder(input: { bookingId: $bookingId }) {
          success
          checkoutUrl
          errors
        }
      }
    GRAPHQL
  end

  let(:studio) { create(:studio) }
  let(:owner) { create(:user, :owner, studio: studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:template) { create(:class_template, instructor: instructor, price_cents: 10_000, currency: "cad") }
  let(:session) { create(:class_session, class_template: template, instructor: instructor) }
  let(:client) { create(:client, studio: studio) }

  let(:fake_checkout_url) { "https://checkout.stripe.com/test-session" }
  let(:fake_checkout_session) { double("Stripe::Checkout::Session", url: fake_checkout_url) }

  before do
    PaymentSetting.delete_all
    PaymentSetting.instance_for(studio).update!(
      default_currency: "cad",
      enabled: true,
      stripe_publishable_key: "pk_test_1",
      stripe_secret_key: "sk_test_1"
    )

    allow(Stripe::Checkout::Session).to receive(:create).and_return(fake_checkout_session)
    allow(BookingMailer).to receive_message_chain(:with, :payment_reminder, :deliver_now)

    sign_in(owner)
  end

  context "when booking.price_cents is 0 but the class template has a price" do
    it "uses the template price and sends the reminder successfully" do
      booking = create(:booking, client: client, class_session: session, studio: studio, paid: false, price_cents: 0)

      json = graphql_post(query: mutation, variables: { bookingId: booking.id.to_s })
      payload = json.dig("data", "sendBookingPaymentReminder")

      expect(payload["errors"]).to be_empty
      expect(payload["success"]).to eq(true)
      expect(payload["checkoutUrl"]).to eq(fake_checkout_url)
      expect(Stripe::Checkout::Session).to have_received(:create) do |params|
        expect(params.dig(:line_items, 0, :price_data, :unit_amount)).to eq(10_000)
      end
    end
  end

  context "when booking.price_cents is set on the booking itself" do
    it "uses the booking price and sends the reminder successfully" do
      booking = create(:booking, client: client, class_session: session, studio: studio, paid: false, price_cents: 8_000)

      json = graphql_post(query: mutation, variables: { bookingId: booking.id.to_s })
      payload = json.dig("data", "sendBookingPaymentReminder")

      expect(payload["errors"]).to be_empty
      expect(payload["success"]).to eq(true)
      expect(Stripe::Checkout::Session).to have_received(:create) do |params|
        expect(params.dig(:line_items, 0, :price_data, :unit_amount)).to eq(8_000)
      end
    end
  end

  context "when neither booking nor template has a price" do
    it "returns a 'no price configured' error" do
      no_price_template = create(:class_template, instructor: instructor, price_cents: 0, currency: "cad")
      no_price_session = create(:class_session, class_template: no_price_template, instructor: instructor)
      booking = create(:booking, client: client, class_session: no_price_session, studio: studio, paid: false, price_cents: 0)

      json = graphql_post(query: mutation, variables: { bookingId: booking.id.to_s })
      payload = json.dig("data", "sendBookingPaymentReminder")

      expect(payload["success"]).to eq(false)
      expect(payload["errors"].join(" ")).to match(/no price configured/i)
    end
  end

  context "when the booking is already paid" do
    it "returns an error" do
      booking = create(:booking, client: client, class_session: session, studio: studio, paid: true, price_cents: 10_000)

      json = graphql_post(query: mutation, variables: { bookingId: booking.id.to_s })
      payload = json.dig("data", "sendBookingPaymentReminder")

      expect(payload["success"]).to eq(false)
      expect(payload["errors"].join(" ")).to match(/already paid/i)
    end
  end

  context "when the booking is cancelled" do
    it "returns an error" do
      booking = create(:booking, client: client, class_session: session, studio: studio, status: :cancelled, paid: false, price_cents: 0)

      json = graphql_post(query: mutation, variables: { bookingId: booking.id.to_s })
      payload = json.dig("data", "sendBookingPaymentReminder")

      expect(payload["success"]).to eq(false)
      expect(payload["errors"].join(" ")).to match(/cancelled/i)
    end
  end

  context "when the user is not authorized" do
    it "returns an error for a client user" do
      client_user = create(:user, :client, studio: studio)
      sign_in(client_user)
      booking = create(:booking, client: client, class_session: session, studio: studio, paid: false, price_cents: 0)

      json = graphql_post(query: mutation, variables: { bookingId: booking.id.to_s })
      payload = json.dig("data", "sendBookingPaymentReminder")

      expect(payload["success"]).to eq(false)
      expect(payload["errors"].join(" ")).to match(/not authorized/i)
    end
  end

  context "when the instructor owns the class session" do
    it "allows the instructor to send a payment reminder" do
      sign_in(instructor)
      booking = create(:booking, client: client, class_session: session, studio: studio, paid: false, price_cents: 0)

      json = graphql_post(query: mutation, variables: { bookingId: booking.id.to_s })
      payload = json.dig("data", "sendBookingPaymentReminder")

      expect(payload["success"]).to eq(true)
      expect(payload["errors"]).to be_empty
    end
  end
end
