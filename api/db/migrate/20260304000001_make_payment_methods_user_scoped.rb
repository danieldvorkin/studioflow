class MakePaymentMethodsUserScoped < ActiveRecord::Migration[8.0]
  def up
    # Add user_id (nullable first so we can backfill)
    unless column_exists?(:client_payment_methods, :user_id)
      add_reference :client_payment_methods, :user, foreign_key: true, null: true, index: false
    end

    # Backfill user_id from the associated client record
    execute <<~SQL
      UPDATE client_payment_methods cpm
      SET user_id = c.user_id
      FROM clients c
      WHERE cpm.client_id = c.id
        AND cpm.user_id IS NULL
        AND c.user_id IS NOT NULL
    SQL

    # Now make user_id non-nullable (all rows should be filled)
    change_column_null :client_payment_methods, :user_id, false

    # Make studio_id nullable – cards belong to the user, not a specific studio
    change_column_null :client_payment_methods, :studio_id, true

    # Replace the unique index from (client_id, stripe_pm_id) → (user_id, stripe_pm_id)
    if index_exists?(:client_payment_methods, [ :client_id, :stripe_payment_method_id ],
                     name: "index_client_payment_methods_on_client_and_stripe_pm")
      remove_index :client_payment_methods,
                   name: "index_client_payment_methods_on_client_and_stripe_pm"
    end

    unless index_exists?(:client_payment_methods, [ :user_id, :stripe_payment_method_id ],
                         name: "index_client_payment_methods_on_user_and_stripe_pm")
      add_index :client_payment_methods, [ :user_id, :stripe_payment_method_id ],
                unique: true, name: "index_client_payment_methods_on_user_and_stripe_pm"
    end
  end

  def down
    remove_index :client_payment_methods, name: "index_client_payment_methods_on_user_and_stripe_pm" rescue nil
    add_index :client_payment_methods, [ :client_id, :stripe_payment_method_id ],
              unique: true, name: "index_client_payment_methods_on_client_and_stripe_pm"
    change_column_null :client_payment_methods, :studio_id, false
    change_column_null :client_payment_methods, :user_id, true
    remove_reference :client_payment_methods, :user, foreign_key: true, index: false rescue nil
  end
end
