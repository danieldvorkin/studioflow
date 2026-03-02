module Mutations
  class CancelBooking < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(id:)
      user = context[:current_user]
      return { success: false, errors: ["Not authenticated"] } unless user

      booking =
        if user.client?
          Booking.find(id)
        else
          Booking.where(studio_id: user.studio_id).find(id)
        end

      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, booking).cancel?

      Booking.transaction do
        booking.update!(status: Booking.statuses[:cancelled])

        # Auto-promote first waitlisted booking for the session
        next_wait = booking.class_session.bookings.where(status: Booking.statuses[:waitlisted]).order(:created_at).first
        if next_wait
          next_wait.update!(status: Booking.statuses[:booked])
          # Notify the promoted booking
          NotificationJob.perform_later(:waitlist_promotion, next_wait.id)
        end
      end

      # Notify cancellation
      NotificationJob.perform_later(:booking_cancellation, booking.id)

      errors = []

      payment = booking.payment
      if payment&.succeeded? && payment.stripe_payment_intent_id.present?
        settings = PaymentSetting.instance_for(booking.studio)
        if settings.configured?
          begin
            Stripe.api_key = settings.stripe_secret_key
            refund = Stripe::Refund.create(payment_intent: payment.stripe_payment_intent_id)
            payment.update!(status: :refunded, raw_response: (payment.raw_response || {}).merge(refund: refund.to_hash))
          rescue Stripe::StripeError => e
            payment.update(error_message: e.message)
            errors << "Booking cancelled, but refund failed: #{e.message}"
          end
        else
          errors << "Booking cancelled, but Stripe is not configured for refunds"
        end
      end

      { success: errors.empty?, errors: errors }
    rescue ActiveRecord::RecordInvalid => e
      { success: false, errors: [e.message] }
    end
  end
end
