module Mutations
  class EnrollClientMembership < BaseMutation
    argument :client_id,         ID,     required: true
    argument :membership_plan_id, ID,    required: true
    argument :started_at,        GraphQL::Types::ISO8601Date, required: false
    argument :notes,             String, required: false

    field :client_membership, Types::ClientMembershipType, null: true
    field :errors, [ String ], null: false

    def resolve(client_id:, membership_plan_id:, started_at: nil, notes: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authenticated" unless user
      raise Pundit::NotAuthorizedError unless user.owner? || user.staff?

      plan = MembershipPlan.find_by(id: membership_plan_id, studio_id: user.studio_id)
      return { client_membership: nil, errors: [ "Membership plan not found" ] } unless plan

      client = Client.find_by(id: client_id, studio_id: user.studio_id)
      return { client_membership: nil, errors: [ "Client not found" ] } unless client

      # Prevent duplicate active memberships on the same plan
      if ClientMembership.exists?(client_id: client.id, membership_plan_id: plan.id, status: "active")
        return { client_membership: nil, errors: [ "Client already has an active membership for this plan" ] }
      end

      membership = ClientMembership.new(
        studio_id: user.studio_id,
        client: client,
        membership_plan: plan,
        status: "active",
        started_at: started_at || Date.today,
        notes: notes
      )

      if membership.save
        { client_membership: membership, errors: [] }
      else
        { client_membership: nil, errors: membership.errors.full_messages }
      end
    end
  end
end
