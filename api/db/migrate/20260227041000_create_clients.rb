class CreateClients < ActiveRecord::Migration[8.1]
  def change
    create_table :clients do |t|
      t.string :name
      t.string :email, index: true
      t.string :phone
      t.references :user, foreign_key: true, null: true
      t.timestamps
    end
  end
end
