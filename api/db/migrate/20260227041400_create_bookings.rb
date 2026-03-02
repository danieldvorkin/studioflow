class CreateBookings < ActiveRecord::Migration[8.1]
  def change
    create_table :bookings do |t|
      t.references :client, foreign_key: true, null: false
      t.references :class_session, foreign_key: true, null: false
      t.integer :status, default: 0
      t.timestamps
    end
  end
end
