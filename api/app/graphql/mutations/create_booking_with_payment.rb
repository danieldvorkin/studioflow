module Mutations
  class CreateBookingWithPayment < BaseMutation
    argument :client_id, ID, required: false
    argument :class_session_id, ID, required: true
    argument :payment_method_id, String, required: false

    field :booking, Types::BookingType, null: true
    field :payment, Types::PaymentType, null: true
    field :errors, [ String ], null: false

    def resolve(client_id: nil, class_session_id:, payment_method_id: nil)
      user = context[:current_user]
      return { booking: nil, payment: nil, errors: [ "Not authenticated" ] } unless user

      policy = Pundit.policy(user, Booking)
      return { booking: nil, payment: nil, errors: [ "Not authorized" ] } unless policy&.create?

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
        return { booking: nil, payment: nil, errors: [ "Stripe is not configured" ] }
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
          return { booking: nil, payment: nil, errors: [ "Client is required" ] } if client_id.blank?
          Client.where(studio_id: user.studio_id).find(client_id)
        end

      if user.client? && client.user_id != user.id
        return { booking: nil, payment: nil, errors: [ "Not authorized" ] }
      end

      payment_method_id ||= client.stripe_default_payment_method_id
      if payment_method_id.blank?
        return { booking: nil, payment: nil, errors: [ "No payment method provided" ] }
      end

      if class_session.instructor_id && InstructorClientBlock.exists?(instructor_id: class_session.instructor_id, client_id: client.id)
        return { booking: nil, payment: nil, errors: [ "This client is blocked from booking with the instructor for this class" ] }
      end
      if (err = client_booking_cutoff_error(class_session, user))
        return { booking: nil, payment: nil, errors: [ err ] }
      end
      class_template = class_session.class_template
      currency = class_template.currency.presence || "cad"

      if class_template.price_cents <= 0
        return { booking: nil, payment: nil, errors: [ "Class has no price configured" ] }
      end

      status     = class_session.seats_available > 0 ? "booked" : "waitlisted"
      waitlisted = status == "waitlisted"

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

      # ── Waitlist path: save card for later, do NOT charge now ─────────────
      if waitlisted
        begin
          ensure_payment_method_saved(client, payment_method_id, settings)
        rescue Stripe::StripeError => e
          # Non-fatal — we still create the waitlist booking even if card attachment fails.
          # The studio can send a payment reminder when the client gets promoted.
          Rails.logger.warn("[CreateBookingWithPayment] Could not save card for waitlist booking: #{e.message}")
        end

        booking = Booking.create!(
          studio_id:   studio_id,
          client:      client,
          class_session: class_session,
          status:      Booking.statuses[:waitlisted],
          paid:        false,
          price_cents: class_template.price_cents
        )

        begin
          NotificationJob.perform_now(:waitlist_confirmation, booking.id)
        rescue => e
          Rails.logger.error("[CreateBookingWithPayment] Waitlist notification failed for booking #{booking.id}: #{e.message}")
        end

        return { booking: booking, payment: nil, errors: [] }
      end

      # ── Booked path: charge Stripe now ────────────────────────────────────
      begin
        intent_params = {
          amount: class_template.price_cents,
          currency: currency,
          payment_method: payment_method_id,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: "never"
          },
          metadata: {
            class_session_id: class_session.id,
            client_id: client.id,
            user_id: user.id
          }
        }

        intent_params[:customer] = client.stripe_customer_id if client.stripe_customer_id.present?

        intent = Stripe::PaymentIntent.create(intent_params)
      rescue Stripe::StripeError => e
        return { booking: nil, payment: nil, errors: [ e.message ] }
      end

      unless intent.status == "succeeded"
        return { booking: nil, payment: nil, errors: [ "Payment did not succeed (status: #{intent.status})" ] }
      end

      booking = nil
      payment = nil

      Booking.transaction do
        booking = Booking.new(
          studio_id: studio_id,
          client: client,
          class_session: class_session,
          status: Booking.statuses[:booked],
          paid: true,
          price_cents: class_template.price_cents
        )

        unless booking.save
          return { booking: nil, payment: nil, errors: booking.errors.full_messages }
        end

        payment = Payment.create!(
          studio_id:                   studio_id,
          booking:                     booking,
          client:                      client,
          class_session:               class_session,
          amount_cents:                class_template.price_cents,
          currency:                    currency,
          status:                      "succeeded",
          stripe_payment_intent_id:    intent.id,
          raw_response:                intent.to_hash
        )
      end

      # Send confirmation emails outside the transaction so a mailer failure
      # never rolls back a successfully captured payment and booking.
      begin
        NotificationJob.perform_now(:booking_confirmation, booking.id)
      rescue => e
        Rails.logger.error("[CreateBookingWithPayment] Notification failed for booking #{booking.id}: #{e.message}")
      end

      { booking: booking, payment: payment, errors: [] }
    end

    private

    # Attaches the payment method to the client's Stripe customer and saves it
    # as their default so WaitlistChargeService can charge it on promotion.
    def ensure_payment_method_saved(client, payment_method_id, settings)
      Stripe.api_key = settings.stripe_secret_key

      if client.stripe_customer_id.blank?
        customer = Stripe::Customer.create(
          email:    client.email,
          name:     client.name,
          metadata: { client_id: client.id }
        )
        client.update_column(:stripe_customer_id, customer.id)
      end

      pm = Stripe::PaymentMethod.retrieve(payment_method_id)
      Stripe::PaymentMethod.attach(payment_method_id, { customer: client.stripe_customer_id }) if pm.customer.blank?

      card = pm.card
      client.update!(
        stripe_default_payment_method_id:        payment_method_id,
        stripe_default_payment_method_brand:     card&.brand,
        stripe_default_payment_method_last4:     card&.last4,
        stripe_default_payment_method_exp_month: card&.exp_month,
        stripe_default_payment_method_exp_year:  card&.exp_year
      )
    end
  end
end
