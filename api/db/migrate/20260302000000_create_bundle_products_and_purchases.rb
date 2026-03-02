class CreateBundleProductsAndPurchases < ActiveRecord::Migration[8.1]
  def change
    create_table :bundle_products do |t|
      t.bigint :studio_id, null: false
      t.string :title, null: false
      t.text :description
      t.boolean :active, null: false, default: true

      t.bigint :class_template_id
      t.bigint :instructor_id

      t.integer :credits_count, null: false
      t.integer :price_cents, null: false
      t.string :currency, null: false, default: 'cad'

      t.timestamps
    end

    add_index :bundle_products, :studio_id
    add_index :bundle_products, :class_template_id
    add_index :bundle_products, :instructor_id
    add_foreign_key :bundle_products, :studios
    add_foreign_key :bundle_products, :class_templates
    add_foreign_key :bundle_products, :users, column: :instructor_id

    create_table :bundle_purchases do |t|
      t.bigint :studio_id, null: false
      t.bigint :client_id, null: false
      t.bigint :bundle_product_id, null: false

      t.integer :credits_total, null: false
      t.integer :credits_remaining, null: false

      t.integer :price_cents, null: false
      t.integer :unit_price_cents, null: false
      t.integer :remainder_cents, null: false, default: 0
      t.string :currency, null: false, default: 'cad'

      t.string :status, null: false, default: 'succeeded'
      t.string :stripe_payment_intent_id
      t.jsonb :raw_response

      t.timestamps
    end

    add_index :bundle_purchases, :studio_id
    add_index :bundle_purchases, :client_id
    add_index :bundle_purchases, :bundle_product_id
    add_foreign_key :bundle_purchases, :studios
    add_foreign_key :bundle_purchases, :clients
    add_foreign_key :bundle_purchases, :bundle_products
  end
end
