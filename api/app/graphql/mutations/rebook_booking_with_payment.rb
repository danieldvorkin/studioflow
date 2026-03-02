module Mutations
  class RebookBookingWithPayment < BaseMutation
    argument :id, ID, required: true
    argument :payment_method_id, String, required: false

    field :booking, Types::BookingType, null: true
    field :payment, Types::PaymentType, null: true
    field :errors, [String], null: false

    def resolve(id:, payment_method_id: nil)
      user = context[:current_user]
      return { booking: nil, payment: nil, errors: ['Not authenticated'] } unless user

      booking = Booking.where(studio_id: user.studio_id).find(id)
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, booking).rebook?

      return { booking: nil, payment: nil, errors: ['Only cancelled bookings can be re-booked'] } unless booking.cancelled?

      class_session = booking.class_session
      class_template = class_session.class_template
      client = booking.client

      payment_method_id ||= client.stripe_default_payment_method_id
      if payment_method_id.blank?
        return { booking: nil, payment: nil, errors: ['No payment method provided'] }
      end

      if class_session.instructor_id && InstructorClientBlock.exists?(instructor_id: class_session.instructor_id, client_id: client.id)
    	return { booking: nil, payment: nil, errors: ['This client is blocked from booking with the instructor for this class'] }
      end

      if class_template.price_cents <= 0
        return { booking: nil, payment: nil, errors: ['Class has no price configured'] }
      end

      currency = class_template.currency.presence || 'cad'
      status = class_session.seats_available > 0 ? 'booked' : 'waitlisted'

      # Validate updated booking state before touching Stripe
      booking.assign_attributes(
        status: Booking.statuses[status],
        archived: false,
        price_cents: class_template.price_cents
      )

      unless booking.valid?
        # Reset in-memory changes so caller doesn't see mutated object
        booking.reload
        return { booking: nil, payment: nil, errors: booking.errors.full_messages }
      end

      settings = PaymentSetting.instance_for(user.studio)
      unless settings.configured?
        return { booking: nil, payment: nil, errors: ['Stripe is not configured'] }
      end

      Stripe.api_key = settings.stripe_secret_key

      begin
        intent_params = {
          amount: class_template.price_cents,
          currency: currency,
          payment_method: payment_method_id,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          },
          metadata: {
            class_session_id: class_session.id,
            client_id: booking.client_id,
            user_id: user.id,
            rebook_for_booking_id: booking.id
          }
        }

        intent_params[:customer] = client.stripe_customer_id if client.stripe_customer_id.present?

        intent = Stripe::PaymentIntent.create(
          intent_params
        )
      rescue Stripe::StripeError => e
        return { booking: nil, payment: nil, errors: [e.message] }
      end

      unless intent.status == 'succeeded'
        return { booking: nil, payment: nil, errors: ["Payment did not succeed (status: #{intent.status})"] }
      end

      payment = nil

      Booking.transaction do
        booking.update!(
          status: Booking.statuses[status],
          archived: false,
          paid: true,
          price_cents: class_template.price_cents
        )

        payment = booking.payment || booking.build_payment
        payment.studio_id ||= booking.studio_id
        payment.assign_attributes(
          client: booking.client,
          class_session: class_session,
          amount_cents: class_template.price_cents,
          currency: currency,
          status: 'succeeded',
          stripe_payment_intent_id: intent.id,
          raw_response: intent.to_hash
        )
        payment.save!

        NotificationJob.perform_later(:booking_confirmation, booking.id)
      end

      { booking: booking, payment: payment, errors: [] }
    rescue ActiveRecord::RecordNotFound
      { booking: nil, payment: nil, errors: ['Booking not found'] }
    end
  end
end
