module Mutations
  class CreateBooking < BaseMutation
    argument :client_id, ID, required: false
    argument :class_session_id, ID, required: true

    field :booking, Types::BookingType, null: true
    field :errors, [ String ], null: false

    def resolve(client_id: nil, class_session_id:)
      user = context[:current_user]
      return { booking: nil, errors: [ "Not authenticated" ] } unless user

      policy = Pundit.policy(user, Booking)
      return { booking: nil, errors: [ "Not authorized" ] } unless policy&.create?

      cs =
        if user.client?
          ClassSession.where(archived: false).find(class_session_id)
        else
          ClassSession.where(studio_id: user.studio_id).find(class_session_id)
        end

      studio_id = cs.studio_id

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
          raise GraphQL::ExecutionError, "Client is required" if client_id.blank?
          Client.where(studio_id: user.studio_id).find(client_id)
        end

      if user.client? && client.user_id != user.id
        return { booking: nil, errors: [ "Not authorized" ] }
      end

      if cs.instructor_id && InstructorClientBlock.exists?(instructor_id: cs.instructor_id, client_id: client.id)
      return { booking: nil, errors: [ "This client is blocked from booking with the instructor for this class" ] }
      end

      status = cs.seats_available > 0 ? "booked" : "waitlisted"
      booking = Booking.new(studio_id: studio_id, client: client, class_session: cs, status: Booking.statuses[status])

      if booking.save
        # Enqueue notification job for booking confirmation or waitlist
        NotificationJob.perform_later(:booking_confirmation, booking.id)
        { booking: booking, errors: [] }
      else
        { booking: nil, errors: booking.errors.full_messages }
      end
    end
  end
end
