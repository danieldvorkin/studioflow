class AddLateCancelPolicyToPaymentSettings < ActiveRecord::Migration[8.0]
  def change
    add_column :payment_settings, :late_cancel_window_minutes, :integer, default: 30, null: false
    add_column :payment_settings, :late_cancel_fee_percent,    :integer, default: 30, null: false
  end
end
