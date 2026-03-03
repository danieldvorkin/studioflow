module Mutations
  class UpdateMembershipPlan < BaseMutation
    argument :id,                             ID,      required: true
    argument :name,                           String,  required: false
    argument :description,                    String,  required: false
    argument :price_cents,                    Integer, required: false
    argument :currency,                       String,  required: false
    argument :reformer_classes_per_month,     Integer, required: false
    argument :mat_classes_per_month,          Integer, required: false
    argument :includes_priority_booking,      Boolean, required: false
    argument :includes_early_booking,         Boolean, required: false
    argument :private_session_discount_percent, Integer, required: false
    argument :guest_passes_per_month,         Integer, required: false
    argument :includes_retail_discount,       Boolean, required: false
    argument :min_commitment_months,          Integer, required: false
    argument :auto_renew,                     Boolean, required: false
    argument :active,                         Boolean, required: false
    argument :position,                       Integer, required: false

    field :membership_plan, Types::MembershipPlanType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, **args)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authenticated" unless user
      raise Pundit::NotAuthorizedError unless user.owner? || user.staff?

      plan = MembershipPlan.find_by(id: id, studio_id: user.studio_id)
      return { membership_plan: nil, errors: [ "Membership plan not found" ] } unless plan

      # Only update provided keys
      args.each { |k, v| plan.send(:"#{k}=", v) unless v.nil? }

      if plan.save
        { membership_plan: plan, errors: [] }
      else
        { membership_plan: nil, errors: plan.errors.full_messages }
      end
    end
  end
end
