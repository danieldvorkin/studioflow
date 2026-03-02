module Mutations
  class ConfirmBookingCheckoutPayment < BaseMutation
    argument :booking_id, ID, required: true
    argument :checkout_session_id, String, required: true

    field :booking, Types::BookingType, null: true
    field :payment, Types::PaymentType, null: true
    field :errors, [ String ], null: false

    def resolve(booking_id:, checkout_session_id:)
      user = context[:current_user]
      return { booking: nil, payment: nil, errors: [ "Not authenticated" ] } unless user

      booking = Booking.includes(:payment, :studio, :client, class_session: :class_template).find(booking_id)

      authorized =
        if user.client?
          booking.client.user_id == user.id
        else
          booking.studio_id == user.studio_id && (
            user.owner? || user.staff? || (user.instructor? && booking.class_session.instructor_id == user.id)
          )
        end

      return { booking: nil, payment: nil, errors: [ "Not authorized" ] } unless authorized

      return { booking: booking, payment: booking.payment, errors: [] } if booking.paid?

      settings = PaymentSetting.instance_for(booking.studio)
      unless settings.configured?
        return { booking: booking, payment: nil, errors: [ "Stripe is not configured" ] }
      end

      Stripe.api_key = settings.stripe_secret_key

      begin
        checkout_session = Stripe::Checkout::Session.retrieve(checkout_session_id)
      rescue Stripe::StripeError => e
        return { booking: booking, payment: nil, errors: [ e.message ] }
      end

      if checkout_session&.metadata&.booking_id.to_s != booking.id.to_s
        return { booking: booking, payment: nil, errors: [ "Checkout session does not match booking" ] }
      end

      unless checkout_session.payment_status == "paid"
        return { booking: booking, payment: nil, errors: [ "Payment is not complete yet" ] }
      end

      intent_id = checkout_session.payment_intent
      if intent_id.blank?
        return { booking: booking, payment: nil, errors: [ "Payment intent is missing" ] }
      end

      begin
        intent = Stripe::PaymentIntent.retrieve(intent_id)
      rescue Stripe::StripeError => e
        return { booking: booking, payment: nil, errors: [ e.message ] }
      end

      unless intent.status == "succeeded"
        return { booking: booking, payment: nil, errors: [ "Payment did not succeed (status: #{intent.status})" ] }
      end

      payment = Payment.find_by(stripe_payment_intent_id: intent.id)

      Booking.transaction do
        booking.update!(
          paid: true,
          price_cents: booking.price_cents.presence || booking.class_session.class_template.price_cents
        )

        payment ||= Payment.create!(
          studio: booking.studio,
          booking: booking,
          client: booking.client,
          class_session: booking.class_session,
          amount_cents: booking.price_cents,
          currency: intent.currency,
          status: "succeeded",
          stripe_payment_intent_id: intent.id,
          raw_response: intent.to_hash
        )

        booking.update!(payment: payment) if booking.payment_id != payment.id
      end

      { booking: booking, payment: payment, errors: [] }
    rescue ActiveRecord::RecordNotFound
      { booking: nil, payment: nil, errors: [ "Booking not found" ] }
    rescue ActiveRecord::RecordInvalid => e
      { booking: booking, payment: payment, errors: e.record.errors.full_messages }
    end
  end
end
