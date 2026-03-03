class CreateStudioSubscriptions < ActiveRecord::Migration[8.1]
  def change
    create_table :studio_subscriptions do |t|
      t.references :studio, null: false, foreign_key: true, index: { unique: true }
      t.string :tier, null: false, default: "basic"
      t.string :status, null: false, default: "trialing"
      t.string :stripe_customer_id
      t.string :stripe_subscription_id
      t.datetime :current_period_end
      t.datetime :cancelled_at
      t.text :notes

      t.timestamps
    end
  end
end
