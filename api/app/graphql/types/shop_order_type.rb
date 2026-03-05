module Types
  class ShopOrderType < Types::BaseObject
    field :id, ID, null: false
    field :studio_id, ID, null: false
    field :shop_item, Types::ShopItemType, null: false
    field :client, Types::ClientType, null: false
    field :quantity, Integer, null: false
    field :total_cents, Integer, null: false
    field :currency, String, null: false
    field :status, String, null: false
    field :stripe_payment_intent_id, String, null: true
    field :rental_due_date, GraphQL::Types::ISO8601Date, null: true
    field :returned_at, GraphQL::Types::ISO8601Date, null: true
    field :notes, String, null: true
    field :rental_agreement_accepted_at, GraphQL::Types::ISO8601DateTime, null: true
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
