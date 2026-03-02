class AddArchivedToClassSessions < ActiveRecord::Migration[8.1]
  def change
    add_column :class_sessions, :archived, :boolean, null: false, default: false
  end
end
