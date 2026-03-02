class AddPaymentFieldsToBookings < ActiveRecord::Migration[8.1]
  def change
    add_column :bookings, :paid, :boolean, null: false, default: false
    add_column :bookings, :price_cents, :integer, null: false, default: 0
  end
end
