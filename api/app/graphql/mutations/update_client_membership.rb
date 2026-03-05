module Mutations
  class UpdateClientMembership < BaseMutation
    argument :id,             ID,     required: true
    argument :status,         String, required: false
    argument :ends_at,        GraphQL::Types::ISO8601Date, required: false
    argument :notes,          String, required: false
    argument :membership_plan_id, ID, required: false

    field :client_membership, Types::ClientMembershipType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, status: nil, ends_at: nil, notes: nil, membership_plan_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authenticated" unless user
      raise Pundit::NotAuthorizedError unless user.godmode? || user.owner? || user.staff?

      membership = ClientMembership.joins(:membership_plan)
                                   .where(id: id, membership_plans: { studio_id: user.studio_id })
                                   .first
      return { client_membership: nil, errors: [ "Membership not found" ] } unless membership

      if status.present?
        unless ClientMembership::STATUSES.include?(status)
          return { client_membership: nil, errors: [ "Invalid status" ] }
        end
        membership.status = status
        membership.cancelled_at = Time.current if status == "cancelled" && membership.cancelled_at.nil?
        membership.cancelled_at = nil if status == "active"
      end

      membership.ends_at = ends_at unless ends_at.nil?
      membership.notes   = notes unless notes.nil?

      if membership_plan_id.present?
        plan = MembershipPlan.find_by(id: membership_plan_id, studio_id: user.studio_id)
        return { client_membership: nil, errors: [ "Plan not found" ] } unless plan
        membership.membership_plan = plan
      end

      if membership.save
        { client_membership: membership, errors: [] }
      else
        { client_membership: nil, errors: membership.errors.full_messages }
      end
    end
  end
end
