module Mutations
  class CreateBookingWithPayment < BaseMutation
    argument :client_id, ID, required: false
    argument :class_session_id, ID, required: true
    argument :payment_method_id, String, required: false

    field :booking, Types::BookingType, null: true
    field :payment, Types::PaymentType, null: true
    field :errors, [String], null: false

    def resolve(client_id: nil, class_session_id:, payment_method_id: nil)
      user = context[:current_user]
      return { booking: nil, payment: nil, errors: ['Not authenticated'] } unless user

      policy = Pundit.policy(user, Booking)
      return { booking: nil, payment: nil, errors: ['Not authorized'] } unless policy&.create?

      class_session =
        if user.client?
          ClassSession.where(archived: false).find(class_session_id)
        else
          ClassSession.where(studio_id: user.studio_id).find(class_session_id)
        end

      studio_id = class_session.studio_id
      studio = Studio.find(studio_id)

      settings = PaymentSetting.instance_for(studio)
      unless settings.configured?
        return { booking: nil, payment: nil, errors: ['Stripe is not configured'] }
      end

      client =
        if user.client?
          if client_id.present?
            Client.where(studio_id: studio_id).find(client_id)
          else
            Client.find_or_initialize_by(user_id: user.id, studio_id: studio_id).tap do |c|
              c.name ||= user.name
              c.email ||= user.email
              c.save!
            end
          end
        else
          return { booking: nil, payment: nil, errors: ['Client is required'] } if client_id.blank?
          Client.where(studio_id: user.studio_id).find(client_id)
        end

      if user.client? && client.user_id != user.id
        return { booking: nil, payment: nil, errors: ['Not authorized'] }
      end

      payment_method_id ||= client.stripe_default_payment_method_id
      if payment_method_id.blank?
        return { booking: nil, payment: nil, errors: ['No payment method provided'] }
      end

      if class_session.instructor_id && InstructorClientBlock.exists?(instructor_id: class_session.instructor_id, client_id: client.id)
    	return { booking: nil, payment: nil, errors: ['This client is blocked from booking with the instructor for this class'] }
      end
      class_template = class_session.class_template
      currency = class_template.currency.presence || 'cad'

      if class_template.price_cents <= 0
        return { booking: nil, payment: nil, errors: ['Class has no price configured'] }
      end

      status = class_session.seats_available > 0 ? 'booked' : 'waitlisted'

      # Validate booking before touching Stripe so we don't charge if it can't be created
      preview_booking = Booking.new(
        studio_id: studio_id,
        client: client,
        class_session: class_session,
        status: Booking.statuses[status],
        paid: false,
        price_cents: class_template.price_cents
      )

      unless preview_booking.valid?
        return { booking: nil, payment: nil, errors: preview_booking.errors.full_messages }
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
            client_id: client.id,
            user_id: user.id
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

      booking = nil
      payment = nil

      Booking.transaction do
        booking = Booking.new(
          studio_id: studio_id,
          client: client,
          class_session: class_session,
          status: Booking.statuses[status],
          paid: true,
          price_cents: class_template.price_cents
        )

        unless booking.save
          return { booking: nil, payment: nil, errors: booking.errors.full_messages }
        end

        payment = Payment.create!(
          studio_id: studio_id,
          booking: booking,
          client: client,
          class_session: class_session,
          amount_cents: class_template.price_cents,
          currency: currency,
          status: 'succeeded',
          stripe_payment_intent_id: intent.id,
          raw_response: intent.to_hash
        )

        NotificationJob.perform_later(:booking_confirmation, booking.id)
      end

      { booking: booking, payment: payment, errors: [] }
    end
  end
end
