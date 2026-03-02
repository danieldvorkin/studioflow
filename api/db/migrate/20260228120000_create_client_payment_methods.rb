class CreateClientPaymentMethods < ActiveRecord::Migration[8.1]
  def change
    create_table :client_payment_methods do |t|
      t.references :client, null: false, foreign_key: true
      t.string :stripe_payment_method_id, null: false
      t.string :brand
      t.string :last4
      t.integer :exp_month
      t.integer :exp_year
      t.boolean :default, null: false, default: false

      t.timestamps
    end

    add_index :client_payment_methods, [ :client_id, :stripe_payment_method_id ], unique: true, name: 'index_client_payment_methods_on_client_and_stripe_pm'
    add_index :client_payment_methods, [ :client_id, :default ]
  end
end
