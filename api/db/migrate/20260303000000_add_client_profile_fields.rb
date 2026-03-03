class AddClientProfileFields < ActiveRecord::Migration[7.1]
  def change
    add_column :clients, :characteristic_scores, :jsonb, null: false, default: []

    create_table :client_notes do |t|
      t.references :client, null: false, foreign_key: true
      t.references :author, null: false, foreign_key: { to_table: :users }
      t.text :body, null: false
      t.timestamps
    end

    add_index :client_notes, [ :client_id, :created_at ]
  end
end
