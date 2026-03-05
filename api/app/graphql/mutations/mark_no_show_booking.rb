module Mutations
  class MarkNoShowBooking < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      return { success: false, errors: [ "Not authenticated" ] } unless user

      booking = Booking.where(studio_id: user.studio_id).find(id)

      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, booking).cancel?

      if booking.cancelled?
        return { success: false, errors: [ "Booking is already cancelled" ] }
      end

      if booking.update(status: Booking.statuses[:no_show])
        { success: true, errors: [] }
      else
        { success: false, errors: booking.errors.full_messages }
      end
    rescue ActiveRecord::RecordNotFound
      { success: false, errors: [ "Booking not found" ] }
    end
  end
end
