# frozen_string_literal: true

# Attempts to charge a promoted waitlist booking using the client's saved
# default payment method. Returns the Payment record on success, nil on failure.
#
# Usage:
#   payment = WaitlistChargeService.call(booking: booking, settings: settings)
#   if payment
#     # charged successfully
#   else
#     # no saved card or charge failed — leave unpaid
#   end
class WaitlistChargeService
  def self.call(booking:, settings:)
    new(booking: booking, settings: settings).call
  end

  def initialize(booking:, settings:)
    @booking  = booking
    @settings = settings
  end

  def call
    return nil unless chargeable?

    Stripe.api_key = @settings.stripe_secret_key
    class_template = @booking.class_session.class_template
    currency       = class_template.currency.presence || "cad"

    intent = Stripe::PaymentIntent.create(
      amount:         @booking.price_cents,
      currency:       currency,
      payment_method: @client.stripe_default_payment_method_id,
      customer:       @client.stripe_customer_id,
      confirm:        true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        class_session_id: @booking.class_session_id,
        client_id:        @client.id,
        booking_id:       @booking.id
      }
    )

    return nil unless intent.status == "succeeded"

    payment = nil
    Booking.transaction do
      payment = Payment.create!(
        studio_id:                  @booking.studio_id,
        booking:                    @booking,
        client:                     @client,
        class_session:              @booking.class_session,
        amount_cents:               @booking.price_cents,
        currency:                   currency,
        status:                     "succeeded",
        stripe_payment_intent_id:   intent.id,
        raw_response:               intent.to_hash
      )
      @booking.update!(paid: true)
    end

    payment
  rescue Stripe::StripeError => e
    Rails.logger.error("[WaitlistChargeService] Stripe error for booking #{@booking.id}: #{e.message}")
    nil
  end

  private

  def chargeable?
    @client = @booking.client
    @booking.price_cents.to_i > 0 &&
      !@booking.paid? &&
      @client.stripe_default_payment_method_id.present? &&
      @client.stripe_customer_id.present? &&
      @settings.configured?
  end
end
