class CreateStudioPages < ActiveRecord::Migration[8.1]
  def change
    create_table :studio_pages do |t|
      t.bigint  :studio_id, null: false
      t.string  :title,     null: false
      t.string  :slug,      null: false
      t.text    :content
      t.boolean :published, default: false, null: false
      t.integer :position,  default: 0,     null: false

      t.timestamps
    end

    add_index :studio_pages, :studio_id
    add_index :studio_pages, %i[studio_id slug], unique: true
  end
end
