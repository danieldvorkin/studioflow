module Mutations
  class CancelBooking < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [ String ], null: false
    field :cancellation_fee_cents, Integer, null: true
    field :refund_cents, Integer, null: true

    def resolve(id:)
      user = context[:current_user]
      return { success: false, errors: [ "Not authenticated" ], cancellation_fee_cents: nil, refund_cents: nil } unless user

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
          NotificationJob.perform_now(:waitlist_promotion, next_wait.id)
        end
      end

      # Notify cancellation
      NotificationJob.perform_now(:booking_cancellation, booking.id)

      # Notify studio owners about the cancellation
      cs = booking.class_session
      time_str = cs.start_time.strftime("%a %-d %b at %-I:%M %p")
      Notification.notify_owners(
        studio:     booking.studio,
        kind:       "booking_cancelled",
        title:      "Booking cancelled – #{cs.class_template&.title || "Class"}",
        body:       "#{booking.client&.name || "A client"} cancelled their booking for #{time_str}.",
        action_url: "/schedule/#{cs.id}"
      )

      errors = []
      cancellation_fee_cents = nil
      refund_cents = nil

      payment = booking.payment
      if payment&.succeeded? && payment.stripe_payment_intent_id.present?
        settings = PaymentSetting.instance_for(booking.studio)
        if settings.configured?
          begin
            Stripe.api_key = settings.stripe_secret_key

            # Determine if a late-cancellation fee applies
            minutes_until_class = (cs.start_time - Time.current) / 60.0
            window = settings.late_cancel_window_minutes.to_i
            fee_percent = settings.late_cancel_fee_percent.to_i
            paid_cents = payment.amount_cents.to_i

            if minutes_until_class >= 0 && minutes_until_class < window && fee_percent > 0 && paid_cents > 0
              # Partial refund: only return (100 - fee_percent)% of the charge
              cancellation_fee_cents = (paid_cents * fee_percent / 100.0).round
              refund_amount = paid_cents - cancellation_fee_cents

              if refund_amount > 0
                refund = Stripe::Refund.create(
                  payment_intent: payment.stripe_payment_intent_id,
                  amount: refund_amount
                )
                payment.update!(
                  status: :partially_refunded,
                  raw_response: (payment.raw_response || {}).merge(refund: refund.to_hash)
                )
              else
                # Fee consumed the entire amount — no Stripe refund call needed
                payment.update!(status: :partially_refunded)
              end

              refund_cents = refund_amount
            else
              # Full refund
              refund = Stripe::Refund.create(payment_intent: payment.stripe_payment_intent_id)
              payment.update!(
                status: :refunded,
                raw_response: (payment.raw_response || {}).merge(refund: refund.to_hash)
              )
              refund_cents = paid_cents
              cancellation_fee_cents = 0
            end
          rescue Stripe::StripeError => e
            payment.update(error_message: e.message)
            errors << "Booking cancelled, but refund failed: #{e.message}"
          end
        else
          errors << "Booking cancelled, but Stripe is not configured for refunds"
        end
      end

      { success: errors.empty?, errors: errors, cancellation_fee_cents: cancellation_fee_cents, refund_cents: refund_cents }
    rescue ActiveRecord::RecordInvalid => e
      { success: false, errors: [ e.message ], cancellation_fee_cents: nil, refund_cents: nil }
    end
  end
end
