class AddAlsoInstructorToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :also_instructor, :boolean, default: false, null: false
  end
end
