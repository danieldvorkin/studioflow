class AddBundleFieldsToClassSessionsAndBookings < ActiveRecord::Migration[8.1]
  def change
    add_column :class_sessions, :bundle_enabled, :boolean, null: false, default: false
    add_column :class_sessions, :bundle_spots, :integer

    add_column :bookings, :bundle_purchase_id, :bigint
    add_index :bookings, :bundle_purchase_id
    add_foreign_key :bookings, :bundle_purchases
  end
end
