class CreateInstructorPayouts < ActiveRecord::Migration[8.1]
  def change
    create_table :instructor_payouts do |t|
      t.references :instructor, null: false, foreign_key: { to_table: :users }
      t.references :created_by, null: false, foreign_key: { to_table: :users }

      t.date :week_start, null: false
      t.date :week_end, null: false
      t.string :currency, null: false

      t.integer :gross_cents, null: false, default: 0
      t.integer :instructor_earnings_cents, null: false, default: 0
      t.integer :studio_cut_cents, null: false, default: 0

      t.string :status, null: false, default: 'draft'
      t.datetime :paid_at

      t.string :stripe_transfer_id
      t.jsonb :stripe_transfer_raw_response

      t.jsonb :calculation_snapshot

      t.timestamps
    end

    add_index :instructor_payouts, [ :instructor_id, :week_start, :currency ], unique: true, name: 'index_instructor_payouts_unique_week_currency'
  end
end
