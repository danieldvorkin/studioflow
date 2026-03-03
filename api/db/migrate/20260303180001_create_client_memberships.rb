class CreateClientMemberships < ActiveRecord::Migration[8.1]
  def change
    create_table :client_memberships do |t|
      t.references :studio,          null: false, foreign_key: true
      t.references :client,          null: false, foreign_key: true
      t.references :membership_plan, null: false, foreign_key: true

      t.string   :status,            null: false, default: "active"
      t.date     :started_at,        null: false
      t.date     :ends_at
      t.datetime :cancelled_at
      t.text     :notes

      t.timestamps
    end

    add_index :client_memberships, [:client_id, :status]
    add_index :client_memberships, [:studio_id, :status]
  end
end
