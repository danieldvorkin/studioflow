module Mutations
  class UpdatePaymentSettings < BaseMutation
    argument :stripe_publishable_key, String, required: false
    argument :stripe_secret_key, String, required: false
    argument :stripe_webhook_secret, String, required: false
    argument :default_currency, String, required: false
    argument :enabled, Boolean, required: false
    argument :dashboard_title, String, required: false
    argument :default_theme, String, required: false
    argument :owner_page_layout, GraphQL::Types::JSON, required: false
    argument :clients_page_enabled, Boolean, required: false

    field :payment_settings, Types::PaymentSettingType, null: true
    field :errors, [ String ], null: false

    def resolve(**attrs)
      user = context[:current_user]
      raise Pundit::NotAuthorizedError unless user&.owner?

      settings = PaymentSetting.instance_for(user.studio)

      # Avoid clearing secrets unless explicitly provided
      if attrs.key?(:stripe_publishable_key)
        settings.stripe_publishable_key = attrs[:stripe_publishable_key]
      end
      if attrs.key?(:stripe_secret_key)
        settings.stripe_secret_key = attrs[:stripe_secret_key]
      end
      if attrs.key?(:stripe_webhook_secret)
        settings.stripe_webhook_secret = attrs[:stripe_webhook_secret]
      end
      settings.default_currency = attrs[:default_currency] if attrs.key?(:default_currency) && !attrs[:default_currency].nil?
      settings.enabled = attrs[:enabled] if attrs.key?(:enabled) && !attrs[:enabled].nil?
      settings.dashboard_title = attrs[:dashboard_title] if attrs.key?(:dashboard_title) && !attrs[:dashboard_title].nil?
      settings.default_theme = attrs[:default_theme] if attrs.key?(:default_theme) && !attrs[:default_theme].nil?
      settings.owner_page_layout = attrs[:owner_page_layout] if attrs.key?(:owner_page_layout) && !attrs[:owner_page_layout].nil?
      settings.clients_page_enabled = attrs[:clients_page_enabled] if attrs.key?(:clients_page_enabled) && !attrs[:clients_page_enabled].nil?

      if settings.save
        { payment_settings: settings, errors: [] }
      else
        { payment_settings: nil, errors: settings.errors.full_messages }
      end
    end
  end
end
