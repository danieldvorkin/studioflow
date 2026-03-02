class AddUiSettingsToPaymentSettings < ActiveRecord::Migration[8.1]
  def change
    add_column :payment_settings, :dashboard_title, :string, default: "Pilates Studio Dashboard", null: false
    add_column :payment_settings, :default_theme, :string, default: "dark", null: false
  end
end
