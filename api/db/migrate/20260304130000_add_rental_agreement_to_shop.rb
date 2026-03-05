class AddRentalAgreementToShop < ActiveRecord::Migration[8.0]
  def change
    # Owner-configurable rental agreement text per item (falls back to studio default if blank)
    add_column :shop_items, :rental_agreement_text, :text

    # Records the exact moment the client accepted the rental agreement
    add_column :shop_orders, :rental_agreement_accepted_at, :datetime
  end
end
