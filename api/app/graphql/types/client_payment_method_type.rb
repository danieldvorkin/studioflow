module Types
  class ClientPaymentMethodType < Types::BaseObject
    field :id, ID, null: false
    field :stripe_payment_method_id, String, null: false
    field :brand, String, null: true
    field :last4, String, null: true
    field :exp_month, Integer, null: true
    field :exp_year, Integer, null: true
    field :default, Boolean, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
