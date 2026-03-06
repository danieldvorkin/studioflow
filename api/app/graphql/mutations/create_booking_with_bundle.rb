module Mutations
  class CreateBookingWithBundle < BaseMutation
    argument :client_id, ID, required: false
    argument :class_session_id, ID, required: true
    argument :bundle_purchase_id, ID, required: true

    field :booking, Types::BookingType, null: true
    field :payment, Types::PaymentType, null: true
    field :bundle_purchase, Types::BundlePurchaseType, null: true
    field :errors, [ String ], null: false

    def resolve(client_id: nil, class_session_id:, bundle_purchase_id:)
      user = context[:current_user]
      return { booking: nil, payment: nil, bundle_purchase: nil, errors: [ "Not authenticated" ] } unless user

      policy = Pundit.policy(user, Booking)
      return { booking: nil, payment: nil, bundle_purchase: nil, errors: [ "Not authorized" ] } unless policy&.create?

      class_session =
        if user.client?
          ClassSession.where(archived: false).find(class_session_id)
        else
          ClassSession.where(studio_id: user.studio_id).find(class_session_id)
        end

      studio_id = class_session.studio_id

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
          return { booking: nil, payment: nil, bundle_purchase: nil, errors: [ "Client is required" ] } if client_id.blank?
          Client.where(studio_id: user.studio_id).find(client_id)
        end

      if user.client? && client.user_id != user.id
        return { booking: nil, payment: nil, bundle_purchase: nil, errors: [ "Not authorized" ] }
      end

      if class_session.instructor_id && InstructorClientBlock.exists?(instructor_id: class_session.instructor_id, client_id: client.id)
        return { booking: nil, payment: nil, bundle_purchase: nil, errors: [ "This client is blocked from booking with the instructor for this class" ] }
      end

      if (err = client_booking_cutoff_error(class_session, user))
        return { booking: nil, payment: nil, bundle_purchase: nil, errors: [ err ] }
      end

      bundle_purchase = BundlePurchase.where(studio_id: studio_id).find(bundle_purchase_id)
      if bundle_purchase.client_id != client.id
        return { booking: nil, payment: nil, bundle_purchase: nil, errors: [ "Bundle purchase does not belong to this client" ] }
      end

      unless class_session.bundle_enabled?
        return { booking: nil, payment: nil, bundle_purchase: bundle_purchase, errors: [ "This session is not available for bundles" ] }
      end

      if class_session.bundle_spots_available.to_i <= 0
        return { booking: nil, payment: nil, bundle_purchase: bundle_purchase, errors: [ "No bundle spots remaining for this session" ] }
      end

      if class_session.seats_available.to_i <= 0
        return { booking: nil, payment: nil, bundle_purchase: bundle_purchase, errors: [ "This session is full" ] }
      end

      preview_booking = Booking.new(
        studio_id: studio_id,
        client: client,
        class_session: class_session,
        status: Booking.statuses[:booked],
        paid: true,
        price_cents: 0,
        bundle_purchase: bundle_purchase
      )

      unless preview_booking.valid?
        return { booking: nil, payment: nil, bundle_purchase: bundle_purchase, errors: preview_booking.errors.full_messages }
      end

      booking = nil
      payment = nil

      Booking.transaction do
        amount_cents = bundle_purchase.redeem_one_credit!(class_session: class_session)

        booking = Booking.create!(
          studio_id: studio_id,
          client: client,
          class_session: class_session,
          status: Booking.statuses[:booked],
          paid: true,
          price_cents: amount_cents,
          bundle_purchase: bundle_purchase
        )

        payment = Payment.create!(
          studio_id: studio_id,
          booking: booking,
          client: client,
          class_session: class_session,
          amount_cents: amount_cents,
          currency: bundle_purchase.currency,
          status: "succeeded",
          raw_response: {
            source: "bundle",
            bundle_purchase_id: bundle_purchase.id,
            bundle_product_id: bundle_purchase.bundle_product_id
          }
        )

        NotificationJob.perform_now(:booking_confirmation, booking.id)
      end

      { booking: booking, payment: payment, bundle_purchase: bundle_purchase, errors: [] }
    rescue ActiveRecord::RecordInvalid => e
      { booking: nil, payment: nil, bundle_purchase: nil, errors: [ e.record.errors.full_messages.presence || e.message ].flatten }
    end
  end
end
