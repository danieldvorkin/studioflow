# frozen_string_literal: true

module Types
  class PlatformStatsType < Types::BaseObject
    field :studios_count,               Integer, null: false
    field :active_subscriptions_count,  Integer, null: false
    field :total_users_count,           Integer, null: false
    field :total_clients_count,         Integer, null: false
    field :total_bookings_count,        Integer, null: false
    field :confirmed_bookings_count,    Integer, null: false
    field :total_payments_count,        Integer, null: false
    field :total_revenue_cents,         Integer, null: false
    field :new_studios_this_month,      Integer, null: false
    field :subscriptions_by_tier,       GraphQL::Types::JSON, null: false
  end
end
