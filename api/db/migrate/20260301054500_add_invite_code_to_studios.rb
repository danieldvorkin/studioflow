# frozen_string_literal: true

class AddInviteCodeToStudios < ActiveRecord::Migration[8.1]
  def up
    add_column :studios, :invite_code, :string unless column_exists?(:studios, :invite_code)

    studio_class = Class.new(ActiveRecord::Base) do
      self.table_name = 'studios'
    end

    studio_class.reset_column_information
    studio_class.where(invite_code: [nil, '']).find_each do |studio|
      studio.update_columns(invite_code: "S#{SecureRandom.hex(6)}")
    end

    change_column_null :studios, :invite_code, false
    add_index :studios, :invite_code, unique: true, if_not_exists: true
  end

  def down
    remove_index :studios, :invite_code if index_exists?(:studios, :invite_code)
    remove_column :studios, :invite_code if column_exists?(:studios, :invite_code)
  end
end
