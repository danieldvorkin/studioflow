class CreateClientInvitations < ActiveRecord::Migration[8.1]
  def change
    create_table :client_invitations do |t|
      t.references :studio, null: false, foreign_key: true
      t.references :invited_by, null: false, foreign_key: { to_table: :users }
      t.string :email, null: false
      t.string :name
      t.string :token, null: false
      t.datetime :accepted_at
      t.datetime :expires_at, null: false

      t.timestamps
    end

    add_index :client_invitations, :token, unique: true
    add_index :client_invitations, [ :studio_id, :email ]
  end
end
