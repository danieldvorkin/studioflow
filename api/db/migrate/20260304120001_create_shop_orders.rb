class CreateShopOrders < ActiveRecord::Migration[8.1]
  def change
    create_table :shop_orders do |t|
      t.bigint :studio_id, null: false
      t.bigint :shop_item_id, null: false
      t.bigint :client_id, null: false
      t.integer :quantity, null: false, default: 1
      t.integer :total_cents, null: false, default: 0
      t.string :currency, null: false, default: "cad"
      t.string :status, null: false, default: "pending"  # pending, paid, cancelled, returned
      t.string :stripe_payment_intent_id
      t.date :rental_due_date   # for rentals
      t.date :returned_at       # for rentals — when item was brought back
      t.text :notes

      t.timestamps
    end

    add_index :shop_orders, :studio_id
    add_index :shop_orders, :shop_item_id
    add_index :shop_orders, :client_id
    add_index :shop_orders, [ :studio_id, :status ]
  end
end
