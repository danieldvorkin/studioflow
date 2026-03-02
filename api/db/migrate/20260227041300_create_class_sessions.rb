class CreateClassSessions < ActiveRecord::Migration[8.1]
  def change
    create_table :class_sessions do |t|
      t.references :class_template, foreign_key: true, null: false
      t.datetime :start_time, null: false
      t.datetime :end_time
      t.references :instructor, foreign_key: { to_table: :users }, null: true
      t.integer :capacity
      t.string :room
      t.timestamps
    end
  end
end
