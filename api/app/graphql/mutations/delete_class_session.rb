module Mutations
  class DeleteClassSession < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      cs = ClassSession.where(studio_id: user&.studio_id).find(id)
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, cs).destroy?

      if cs.archived?
        return { success: true, errors: [] }
      end

      ClassSession.transaction do
        cs.update!(archived: true)
        cs.bookings.update_all(archived: true, updated_at: Time.current)
      end

      { success: true, errors: [] }
    rescue StandardError => e
      { success: false, errors: [ e.message ] }
    end
  end
end
