class CreatePayments < ActiveRecord::Migration[8.1]
  def change
    create_table :payments do |t|
      t.references :booking, foreign_key: true, null: true
      t.references :client, foreign_key: true, null: true
      t.references :class_session, foreign_key: true, null: true

      t.integer :amount_cents, null: false, default: 0
      t.string :currency, null: false, default: "cad"
      t.string :status, null: false, default: "pending"
      t.string :stripe_payment_intent_id
      t.text :error_message
      t.jsonb :raw_response

      t.timestamps
    end
  end
end
