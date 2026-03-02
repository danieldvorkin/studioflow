class AddCurrencyToClassTemplates < ActiveRecord::Migration[8.1]
  def change
    add_column :class_templates, :currency, :string, null: false, default: "cad"
  end
end
