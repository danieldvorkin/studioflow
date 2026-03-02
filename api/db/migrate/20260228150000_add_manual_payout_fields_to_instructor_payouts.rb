class AddManualPayoutFieldsToInstructorPayouts < ActiveRecord::Migration[7.1]
  def change
    add_column :instructor_payouts, :paid_method, :string
    add_column :instructor_payouts, :paid_reference, :string
    add_column :instructor_payouts, :paid_notes, :text
  end
end
