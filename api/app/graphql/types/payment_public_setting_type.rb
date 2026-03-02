# frozen_string_literal: true

module Types
  class PaymentPublicSettingType < Types::BaseObject
    field :stripe_publishable_key, String, null: true
    field :default_currency, String, null: false
    field :enabled, Boolean, null: false
    field :configured, Boolean, null: false

    def configured
      object.configured?
    end
  end
end
