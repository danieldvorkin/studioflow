# frozen_string_literal: true

class CreateNotifications < ActiveRecord::Migration[8.1]
  def change
    create_table :notifications do |t|
      # Recipient — always a user (owner, staff, etc.)
      t.references :user, null: false, foreign_key: true, index: true

      # Optional studio scope (nil for platform-wide notifications)
      t.references :studio, null: true, foreign_key: true, index: true

      # Notification kind — used to select template / icon in the UI
      # e.g. subscription_trial_ending, subscription_past_due,
      #       subscription_cancelled, subscription_renewed,
      #       payment_failed, general
      t.string :kind, null: false, default: "general"

      # Short human-readable title + longer body
      t.string :title, null: false
      t.text   :body

      # Optional deep-link target within the app
      t.string :action_url

      # Read / dismissed state
      t.datetime :read_at
      t.datetime :dismissed_at

      t.timestamps
    end

    add_index :notifications, [ :user_id, :read_at ]
    add_index :notifications, [ :user_id, :dismissed_at ]
  end
end
