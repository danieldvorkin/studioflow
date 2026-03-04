module Mutations
  class DeleteMembershipPlan < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authenticated" unless user
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, MembershipPlan).destroy?

      plan = MembershipPlan.find_by(id: id, studio_id: user.studio_id)
      return { success: false, errors: [ "Membership plan not found" ] } unless plan

      if plan.client_memberships.exists?
        return { success: false, errors: [ "Cannot delete a plan with enrolled clients. Deactivate it instead." ] }
      end

      plan.destroy
      { success: true, errors: [] }
    end
  end
end
