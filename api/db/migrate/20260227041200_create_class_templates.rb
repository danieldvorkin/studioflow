class CreateClassTemplates < ActiveRecord::Migration[8.1]
  def change
    create_table :class_templates do |t|
      t.string :title, null: false
      t.text :description
      t.integer :capacity, default: 12
      t.integer :duration_minutes, default: 50
      t.references :studio_location, foreign_key: true, null: true
      t.references :instructor, foreign_key: { to_table: :users }, null: true
      t.timestamps
    end
  end
end
