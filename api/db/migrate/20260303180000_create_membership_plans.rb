class CreateMembershipPlans < ActiveRecord::Migration[8.1]
  def change
    create_table :membership_plans do |t|
      t.references :studio, null: false, foreign_key: true
      t.string  :name,                          null: false
      t.text    :description
      t.integer :price_cents,                   null: false, default: 0
      t.string  :currency,                      null: false, default: "cad"

      # Class allowances (null = unlimited)
      t.integer :reformer_classes_per_month
      t.integer :mat_classes_per_month

      # Perks
      t.boolean :includes_priority_booking,     null: false, default: false
      t.boolean :includes_early_booking,        null: false, default: false
      t.integer :private_session_discount_percent, null: false, default: 0
      t.integer :guest_passes_per_month,        null: false, default: 0
      t.boolean :includes_retail_discount,      null: false, default: false

      # Terms
      t.integer :min_commitment_months,         null: false, default: 3
      t.boolean :auto_renew,                    null: false, default: true

      # Visibility
      t.boolean :active,                        null: false, default: false
      t.integer :position,                      null: false, default: 0

      t.timestamps
    end

    add_index :membership_plans, [:studio_id, :position]
  end
end
