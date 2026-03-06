module Types
  class PaymentSettingType < Types::BaseObject
    field :id, ID, null: false
    field :stripe_publishable_key, String, null: true
    field :default_currency, String, null: false
    field :enabled, Boolean, null: false
    field :configured, Boolean, null: false
    field :dashboard_title, String, null: false
    field :default_theme, String, null: false
    field :owner_page_layout, GraphQL::Types::JSON, null: false
    field :clients_page_enabled, Boolean, null: false
    field :late_cancel_window_minutes, Integer, null: false
    field :late_cancel_fee_percent, Integer, null: false

    def configured
      object.configured?
    end
  end
end
