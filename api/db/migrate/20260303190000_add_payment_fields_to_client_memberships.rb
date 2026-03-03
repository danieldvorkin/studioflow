class AddPaymentFieldsToClientMemberships < ActiveRecord::Migration[8.1]
  def change
    add_column :client_memberships, :stripe_payment_intent_id, :string
    add_column :client_memberships, :price_cents,              :integer
    add_column :client_memberships, :currency,                 :string, default: "cad"
  end
end
