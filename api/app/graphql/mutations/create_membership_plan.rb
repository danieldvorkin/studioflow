module Mutations
  class CreateMembershipPlan < BaseMutation
    argument :name,                           String,  required: true
    argument :description,                    String,  required: false
    argument :price_cents,                    Integer, required: true
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

    def resolve(**args)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authenticated" unless user
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, MembershipPlan).create?

      plan = MembershipPlan.new(args.merge(studio_id: user.studio_id))
      plan.currency ||= "cad"

      if plan.save
        { membership_plan: plan, errors: [] }
      else
        { membership_plan: nil, errors: plan.errors.full_messages }
      end
    end
  end
end
