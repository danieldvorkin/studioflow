class AddArchivedToBookings < ActiveRecord::Migration[7.1]
  def change
    add_column :bookings, :archived, :boolean, null: false, default: false
  end
end
