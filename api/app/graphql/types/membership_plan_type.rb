module Types
  class MembershipPlanType < Types::BaseObject
    field :id,          ID,      null: false
    field :studio_id,   ID,      null: false
    field :name,        String,  null: false
    field :description, String,  null: true
    field :price_cents, Integer, null: false
    field :currency,    String,  null: false

    field :reformer_classes_per_month,         Integer, null: true,  description: "null = unlimited"
    field :mat_classes_per_month,              Integer, null: true,  description: "null = unlimited"
    field :includes_priority_booking,          Boolean, null: false
    field :includes_early_booking,             Boolean, null: false
    field :private_session_discount_percent,   Integer, null: false
    field :guest_passes_per_month,             Integer, null: false
    field :includes_retail_discount,           Boolean, null: false

    field :min_commitment_months, Integer, null: false
    field :auto_renew,            Boolean, null: false
    field :active,                Boolean, null: false
    field :position,              Integer, null: false

    field :enrolled_count, Integer, null: false
    def enrolled_count
      object.client_memberships.where(status: "active").count
    end

    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
