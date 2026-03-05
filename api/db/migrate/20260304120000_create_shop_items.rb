class CreateShopItems < ActiveRecord::Migration[8.1]
  def change
    create_table :shop_items do |t|
      t.bigint :studio_id, null: false
      t.string :title, null: false
      t.text :description
      t.integer :price_cents, null: false, default: 0
      t.string :currency, null: false, default: "cad"
      t.string :item_type, null: false, default: "sale"  # "sale" or "rental"
      t.integer :stock_quantity  # nil = unlimited
      t.boolean :active, null: false, default: true
      t.string :image_url

      t.timestamps
    end

    add_index :shop_items, :studio_id
    add_index :shop_items, [ :studio_id, :active ]
  end
end
