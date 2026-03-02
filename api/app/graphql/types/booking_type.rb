module Types
  class BookingType < Types::BaseObject
    field :id, ID, null: false
    field :studio_id, ID, null: false
    field :slug, String, null: true
    field :client, Types::ClientType, null: false
    field :class_session, Types::ClassSessionType, null: false
    field :status, String, null: false
    field :paid, Boolean, null: false
    field :price_cents, Integer, null: false
    field :archived, Boolean, null: false
    field :payment, Types::PaymentType, null: true
    field :bundle_purchase, Types::BundlePurchaseType, null: true
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
