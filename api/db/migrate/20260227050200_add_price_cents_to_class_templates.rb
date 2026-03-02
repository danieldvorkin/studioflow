class AddPriceCentsToClassTemplates < ActiveRecord::Migration[8.1]
  def change
    add_column :class_templates, :price_cents, :integer, null: false, default: 0
  end
end
