class CreatePaymentSettings < ActiveRecord::Migration[8.1]
  def change
    create_table :payment_settings do |t|
      t.string :stripe_publishable_key
      t.string :stripe_secret_key
      t.string :stripe_webhook_secret
      t.string :default_currency, default: "cad"
      t.boolean :enabled, default: false, null: false

      t.timestamps
    end
  end
end
