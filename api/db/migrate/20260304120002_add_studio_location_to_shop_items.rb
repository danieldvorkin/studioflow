class AddStudioLocationToShopItems < ActiveRecord::Migration[8.0]
  def change
    add_reference :shop_items, :studio_location, null: true, foreign_key: true, index: true
  end
end
