class AddApprovedToClassTemplates < ActiveRecord::Migration[8.1]
  def change
    # default false; existing rows (all created by owners/staff) are backfilled to true
    add_column :class_templates, :approved, :boolean, default: false, null: false
    ClassTemplate.update_all(approved: true) # rubocop:disable Rails/SkipsModelValidations
  end
end
