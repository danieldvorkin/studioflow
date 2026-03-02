module Types
  class BundlePurchaseType < Types::BaseObject
    field :id, ID, null: false
    field :studio_id, ID, null: false

    field :status, String, null: false
    field :credits_total, Integer, null: false
    field :credits_remaining, Integer, null: false

    field :price_cents, Integer, null: false
    field :currency, String, null: false

    field :bundle_product, Types::BundleProductType, null: false
    field :client, Types::ClientType, null: false

    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
