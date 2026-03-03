# frozen_string_literal: true

module Types
  class PlatformPaymentSettingType < Types::BaseObject
    field :stripe_publishable_key, String, null: true
    field :configured, Boolean, null: false

    def stripe_publishable_key
      object[:stripe_publishable_key]
    end

    def configured
      object[:configured]
    end
  end
end
