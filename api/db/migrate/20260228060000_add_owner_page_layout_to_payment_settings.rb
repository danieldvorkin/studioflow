class AddOwnerPageLayoutToPaymentSettings < ActiveRecord::Migration[8.1]
  def change
    add_column :payment_settings, :owner_page_layout, :jsonb, null: false, default: {}
  end
end
