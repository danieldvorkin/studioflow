# frozen_string_literal: true

class AddStripeFieldsToClients < ActiveRecord::Migration[8.1]
  def change
    add_column :clients, :stripe_customer_id, :string

    add_column :clients, :stripe_default_payment_method_id, :string
    add_column :clients, :stripe_default_payment_method_brand, :string
    add_column :clients, :stripe_default_payment_method_last4, :string
    add_column :clients, :stripe_default_payment_method_exp_month, :integer
    add_column :clients, :stripe_default_payment_method_exp_year, :integer

    add_index :clients, :stripe_customer_id
    add_index :clients, :stripe_default_payment_method_id
  end
end
