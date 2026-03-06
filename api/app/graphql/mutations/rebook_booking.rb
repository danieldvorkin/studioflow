module Mutations
  class RebookBooking < BaseMutation
    argument :id, ID, required: true

    field :booking, Types::BookingType, null: true
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      return { booking: nil, errors: [ "Not authenticated" ] } unless user

      booking = Booking.where(studio_id: user.studio_id).find(id)
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, booking).rebook?

      return { booking: nil, errors: [ "Only cancelled bookings can be re-booked" ] } unless booking.cancelled?

      class_session = booking.class_session
      client = booking.client

      if class_session.instructor_id && InstructorClientBlock.exists?(instructor_id: class_session.instructor_id, client_id: client.id)
        return { booking: nil, errors: [ "This client is blocked from booking with the instructor for this class" ] }
      end

      if (err = client_booking_cutoff_error(class_session, user))
        return { booking: nil, errors: [ err ] }
      end

      status = class_session.seats_available > 0 ? "booked" : "waitlisted"

      if booking.update(status: Booking.statuses[status], archived: false)
        NotificationJob.perform_now(:booking_confirmation, booking.id)
        { booking: booking, errors: [] }
      else
        { booking: nil, errors: booking.errors.full_messages }
      end
    rescue ActiveRecord::RecordNotFound
      { booking: nil, errors: [ "Booking not found" ] }
    end
  end
end
