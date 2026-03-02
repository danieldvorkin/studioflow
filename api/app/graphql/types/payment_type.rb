module Types
  class PaymentType < Types::BaseObject
    field :id, ID, null: false
    field :booking, Types::BookingType, null: true
    field :client, Types::ClientType, null: true
    field :class_session, Types::ClassSessionType, null: true
    field :amount_cents, Integer, null: false
    field :currency, String, null: false
    field :status, String, null: false
    field :stripe_payment_intent_id, String, null: true
    field :error_message, String, null: true
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
