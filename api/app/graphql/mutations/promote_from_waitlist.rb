# frozen_string_literal: true

module Mutations
  class PromoteFromWaitlist < BaseMutation
    argument :id, ID, required: true

    field :booking, Types::BookingType, null: true
    field :success, Boolean, null: false
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      return { booking: nil, success: false, errors: [ "Not authenticated" ] } unless user

      booking = Booking.where(studio_id: user.studio_id).find(id)

      unless user.godmode? || user.owner? || user.staff? ||
             (user.instructor? && booking.class_session.instructor_id == user.id)
        return { booking: nil, success: false, errors: [ "Not authorized" ] }
      end

      unless booking.waitlisted?
        return { booking: nil, success: false, errors: [ "Booking is not on the waitlist" ] }
      end

      cs = booking.class_session
      if cs.seats_available <= 0
        return { booking: nil, success: false, errors: [ "No seats available — cancel an existing booking first" ] }
      end

      booking.update!(status: Booking.statuses[:booked])

      # Attempt to charge the client's saved card now that they have a confirmed spot.
      settings = PaymentSetting.instance_for(booking.studio)
      WaitlistChargeService.call(booking: booking, settings: settings)

      NotificationJob.perform_now(:waitlist_promotion, booking.id)

      { booking: booking, success: true, errors: [] }
    rescue ActiveRecord::RecordNotFound
      { booking: nil, success: false, errors: [ "Booking not found" ] }
    end
  end
end
