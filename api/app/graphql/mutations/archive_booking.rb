module Mutations
  class ArchiveBooking < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      return { success: false, errors: [ "Not authenticated" ] } unless user

      booking =
        if user.client?
          Booking.find(id)
        else
          Booking.where(studio_id: user.studio_id).find(id)
        end

      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, booking).archive?

      if booking.update(archived: true)
        { success: true, errors: [] }
      else
        { success: false, errors: booking.errors.full_messages }
      end
    rescue ActiveRecord::RecordNotFound
      { success: false, errors: [ "Booking not found" ] }
    end
  end
end
