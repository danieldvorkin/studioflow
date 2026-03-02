class MakeClassSessionsUniqueIndexIgnoreArchived < ActiveRecord::Migration[8.1]
  def up
    remove_index :class_sessions, name: "index_class_sessions_on_class_template_id_and_start_time"

    add_index :class_sessions,
              [ :class_template_id, :start_time ],
              unique: true,
              where: "archived = false",
              name: "index_class_sessions_on_class_template_id_and_start_time"
  end

  def down
    remove_index :class_sessions, name: "index_class_sessions_on_class_template_id_and_start_time"

    add_index :class_sessions,
              [ :class_template_id, :start_time ],
              unique: true,
              name: "index_class_sessions_on_class_template_id_and_start_time"
  end
end
