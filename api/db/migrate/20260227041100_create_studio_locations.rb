class CreateStudioLocations < ActiveRecord::Migration[8.1]
  def change
    create_table :studio_locations do |t|
      t.string :name, null: false
      t.string :address
      t.string :city
      t.string :state
      t.string :zip
      t.timestamps
    end
  end
end
