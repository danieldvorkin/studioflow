class CreateFavoriteClassSessions < ActiveRecord::Migration[7.1]
  def change
    create_table :favorite_class_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.references :class_session, null: false, foreign_key: true

      t.timestamps
    end

    add_index :favorite_class_sessions,
              %i[user_id class_session_id],
              unique: true,
              name: 'idx_favorite_class_sessions_user_session_unique'
  end
end
