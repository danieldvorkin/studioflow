class AddClientsPageEnabledToPaymentSettings < ActiveRecord::Migration[8.1]
  def change
    add_column :payment_settings, :clients_page_enabled, :boolean, null: false, default: true
  end
end
