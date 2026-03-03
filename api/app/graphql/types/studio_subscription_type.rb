# frozen_string_literal: true

module Types
  class StudioSubscriptionType < Types::BaseObject
    field :id, ID, null: false
    field :studio_id, ID, null: false
    field :studio, Types::StudioType, null: true
    field :tier, String, null: false
    field :status, String, null: false
    field :stripe_customer_id, String, null: true
    field :stripe_subscription_id, String, null: true
    field :current_period_end, GraphQL::Types::ISO8601DateTime, null: true
    field :cancelled_at, GraphQL::Types::ISO8601DateTime, null: true
    field :notes, String, null: true
    field :price_cad, Integer, null: false
    field :active, Boolean, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false

    def price_cad
      object.price_cad
    end

    def active
      object.active?
    end
  end
end
