module Types
  class ClientMembershipType < Types::BaseObject
    field :id,              ID,     null: false
    field :studio_id,       ID,     null: false
    field :status,          String, null: false

    field :client,          Types::ClientType,         null: false
    field :membership_plan, Types::MembershipPlanType, null: false

    field :started_at,    GraphQL::Types::ISO8601Date,     null: false
    field :ends_at,       GraphQL::Types::ISO8601Date,     null: true
    field :cancelled_at,  GraphQL::Types::ISO8601DateTime, null: true
    field :notes,         String,                          null: true

    field :price_cents,              Integer, null: true
    field :currency,                 String,  null: true
    field :stripe_payment_intent_id, String,  null: true

    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
