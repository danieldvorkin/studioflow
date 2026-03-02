class AddStatusFlagsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :active, :boolean, null: false, default: true
    add_column :users, :available_for_sessions, :boolean, null: false, default: true
  end
end
