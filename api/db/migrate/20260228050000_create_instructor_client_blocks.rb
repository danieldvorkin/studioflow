class CreateInstructorClientBlocks < ActiveRecord::Migration[7.1]
  def change
    create_table :instructor_client_blocks do |t|
      t.references :instructor, null: false, foreign_key: { to_table: :users }
      t.references :client, null: false, foreign_key: true

      t.timestamps
    end

    add_index :instructor_client_blocks, [:instructor_id, :client_id], unique: true, name: 'index_instructor_client_blocks_on_instructor_and_client'
  end
end
