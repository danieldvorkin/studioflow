module Mutations
  class DeleteClassTemplate < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [String], null: false

    def resolve(id:)
      user = context[:current_user]
      ct = ClassTemplate.where(studio_id: user&.studio_id).find(id)
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, ct).destroy?

      ct.destroy!
      { success: true, errors: [] }
    rescue StandardError => e
      { success: false, errors: [e.message] }
    end
  end
end
