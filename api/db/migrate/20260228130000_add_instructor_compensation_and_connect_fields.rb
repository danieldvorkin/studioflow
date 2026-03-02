class AddInstructorCompensationAndConnectFields < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :instructor_compensation_type, :string, null: false, default: 'revenue_share'
    add_column :users, :instructor_default_split_percent, :integer, null: false, default: 50
    add_column :users, :instructor_default_flat_rate_cents, :integer, null: false, default: 0

    add_column :users, :stripe_connect_account_id, :string
    add_column :users, :stripe_connect_onboarding_completed, :boolean, null: false, default: false

    add_column :class_templates, :compensation_type, :string
    add_column :class_templates, :instructor_split_percent, :integer
    add_column :class_templates, :instructor_flat_rate_cents, :integer

    add_index :users, :stripe_connect_account_id
  end
end
