# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_03_04_130000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "bookings", force: :cascade do |t|
    t.boolean "archived", default: false, null: false
    t.bigint "bundle_purchase_id"
    t.bigint "class_session_id", null: false
    t.bigint "client_id", null: false
    t.datetime "created_at", null: false
    t.boolean "paid", default: false, null: false
    t.integer "price_cents", default: 0, null: false
    t.string "slug"
    t.integer "status", default: 0
    t.bigint "studio_id", null: false
    t.datetime "updated_at", null: false
    t.index ["bundle_purchase_id"], name: "index_bookings_on_bundle_purchase_id"
    t.index ["class_session_id"], name: "index_bookings_on_class_session_id"
    t.index ["client_id"], name: "index_bookings_on_client_id"
    t.index ["slug"], name: "index_bookings_on_slug", unique: true
    t.index ["studio_id"], name: "index_bookings_on_studio_id"
  end

  create_table "bundle_products", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.bigint "class_template_id"
    t.datetime "created_at", null: false
    t.integer "credits_count", null: false
    t.string "currency", default: "cad", null: false
    t.text "description"
    t.bigint "instructor_id"
    t.integer "price_cents", null: false
    t.bigint "studio_id", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["class_template_id"], name: "index_bundle_products_on_class_template_id"
    t.index ["instructor_id"], name: "index_bundle_products_on_instructor_id"
    t.index ["studio_id"], name: "index_bundle_products_on_studio_id"
  end

  create_table "bundle_purchases", force: :cascade do |t|
    t.bigint "bundle_product_id", null: false
    t.bigint "client_id", null: false
    t.datetime "created_at", null: false
    t.integer "credits_remaining", null: false
    t.integer "credits_total", null: false
    t.string "currency", default: "cad", null: false
    t.integer "price_cents", null: false
    t.jsonb "raw_response"
    t.integer "remainder_cents", default: 0, null: false
    t.string "status", default: "succeeded", null: false
    t.string "stripe_payment_intent_id"
    t.bigint "studio_id", null: false
    t.integer "unit_price_cents", null: false
    t.datetime "updated_at", null: false
    t.index ["bundle_product_id"], name: "index_bundle_purchases_on_bundle_product_id"
    t.index ["client_id"], name: "index_bundle_purchases_on_client_id"
    t.index ["studio_id"], name: "index_bundle_purchases_on_studio_id"
  end

  create_table "class_sessions", force: :cascade do |t|
    t.boolean "archived", default: false, null: false
    t.boolean "bundle_enabled", default: false, null: false
    t.integer "bundle_spots"
    t.integer "capacity"
    t.bigint "class_template_id", null: false
    t.datetime "created_at", null: false
    t.datetime "end_time"
    t.bigint "instructor_id"
    t.string "room"
    t.datetime "start_time", null: false
    t.bigint "studio_id", null: false
    t.datetime "updated_at", null: false
    t.index ["class_template_id", "start_time"], name: "index_class_sessions_on_class_template_id_and_start_time", unique: true, where: "(archived = false)"
    t.index ["class_template_id"], name: "index_class_sessions_on_class_template_id"
    t.index ["instructor_id"], name: "index_class_sessions_on_instructor_id"
    t.index ["studio_id"], name: "index_class_sessions_on_studio_id"
  end

  create_table "class_templates", force: :cascade do |t|
    t.integer "capacity", default: 12
    t.string "compensation_type"
    t.datetime "created_at", null: false
    t.string "currency", default: "cad", null: false
    t.text "description"
    t.integer "duration_minutes", default: 50
    t.integer "instructor_flat_rate_cents"
    t.bigint "instructor_id"
    t.integer "instructor_split_percent"
    t.integer "price_cents", default: 0, null: false
    t.bigint "studio_id", null: false
    t.bigint "studio_location_id"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["instructor_id"], name: "index_class_templates_on_instructor_id"
    t.index ["studio_id"], name: "index_class_templates_on_studio_id"
    t.index ["studio_location_id"], name: "index_class_templates_on_studio_location_id"
  end

  create_table "client_invitations", force: :cascade do |t|
    t.datetime "accepted_at"
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.datetime "expires_at", null: false
    t.bigint "invited_by_id", null: false
    t.string "name"
    t.bigint "studio_id", null: false
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.index ["invited_by_id"], name: "index_client_invitations_on_invited_by_id"
    t.index ["studio_id", "email"], name: "index_client_invitations_on_studio_id_and_email"
    t.index ["studio_id"], name: "index_client_invitations_on_studio_id"
    t.index ["token"], name: "index_client_invitations_on_token", unique: true
  end

  create_table "client_memberships", force: :cascade do |t|
    t.datetime "cancelled_at"
    t.bigint "client_id", null: false
    t.datetime "created_at", null: false
    t.string "currency", default: "cad"
    t.date "ends_at"
    t.bigint "membership_plan_id", null: false
    t.text "notes"
    t.integer "price_cents"
    t.date "started_at", null: false
    t.string "status", default: "active", null: false
    t.string "stripe_payment_intent_id"
    t.bigint "studio_id", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id", "status"], name: "index_client_memberships_on_client_id_and_status"
    t.index ["client_id"], name: "index_client_memberships_on_client_id"
    t.index ["membership_plan_id"], name: "index_client_memberships_on_membership_plan_id"
    t.index ["studio_id", "status"], name: "index_client_memberships_on_studio_id_and_status"
    t.index ["studio_id"], name: "index_client_memberships_on_studio_id"
  end

  create_table "client_notes", force: :cascade do |t|
    t.bigint "author_id", null: false
    t.text "body", null: false
    t.bigint "client_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["author_id"], name: "index_client_notes_on_author_id"
    t.index ["client_id", "created_at"], name: "index_client_notes_on_client_id_and_created_at"
    t.index ["client_id"], name: "index_client_notes_on_client_id"
  end

  create_table "client_payment_methods", force: :cascade do |t|
    t.string "brand"
    t.bigint "client_id", null: false
    t.datetime "created_at", null: false
    t.boolean "default", default: false, null: false
    t.integer "exp_month"
    t.integer "exp_year"
    t.string "last4"
    t.string "stripe_payment_method_id", null: false
    t.bigint "studio_id"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["client_id", "default"], name: "index_client_payment_methods_on_client_id_and_default"
    t.index ["client_id"], name: "index_client_payment_methods_on_client_id"
    t.index ["user_id", "stripe_payment_method_id"], name: "index_client_payment_methods_on_user_and_stripe_pm", unique: true
  end

  create_table "clients", force: :cascade do |t|
    t.jsonb "characteristic_scores", default: [], null: false
    t.datetime "created_at", null: false
    t.string "email"
    t.string "name"
    t.string "phone"
    t.string "stripe_customer_id"
    t.string "stripe_default_payment_method_brand"
    t.integer "stripe_default_payment_method_exp_month"
    t.integer "stripe_default_payment_method_exp_year"
    t.string "stripe_default_payment_method_id"
    t.string "stripe_default_payment_method_last4"
    t.bigint "studio_id", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id"
    t.index ["email"], name: "index_clients_on_email"
    t.index ["stripe_customer_id"], name: "index_clients_on_stripe_customer_id"
    t.index ["stripe_default_payment_method_id"], name: "index_clients_on_stripe_default_payment_method_id"
    t.index ["studio_id"], name: "index_clients_on_studio_id"
    t.index ["user_id"], name: "index_clients_on_user_id"
  end

  create_table "favorite_class_sessions", force: :cascade do |t|
    t.bigint "class_session_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["class_session_id"], name: "index_favorite_class_sessions_on_class_session_id"
    t.index ["user_id", "class_session_id"], name: "idx_favorite_class_sessions_user_session_unique", unique: true
    t.index ["user_id"], name: "index_favorite_class_sessions_on_user_id"
  end

  create_table "instructor_client_blocks", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.datetime "created_at", null: false
    t.bigint "instructor_id", null: false
    t.bigint "studio_id", null: false
    t.datetime "updated_at", null: false
    t.index ["client_id"], name: "index_instructor_client_blocks_on_client_id"
    t.index ["instructor_id", "client_id"], name: "index_instructor_client_blocks_on_instructor_and_client", unique: true
    t.index ["instructor_id"], name: "index_instructor_client_blocks_on_instructor_id"
  end

  create_table "instructor_payouts", force: :cascade do |t|
    t.jsonb "calculation_snapshot"
    t.datetime "created_at", null: false
    t.bigint "created_by_id", null: false
    t.string "currency", null: false
    t.integer "gross_cents", default: 0, null: false
    t.integer "instructor_earnings_cents", default: 0, null: false
    t.bigint "instructor_id", null: false
    t.datetime "paid_at"
    t.string "paid_method"
    t.text "paid_notes"
    t.string "paid_reference"
    t.string "status", default: "draft", null: false
    t.string "stripe_transfer_id"
    t.jsonb "stripe_transfer_raw_response"
    t.integer "studio_cut_cents", default: 0, null: false
    t.bigint "studio_id", null: false
    t.datetime "updated_at", null: false
    t.date "week_end", null: false
    t.date "week_start", null: false
    t.index ["created_by_id"], name: "index_instructor_payouts_on_created_by_id"
    t.index ["instructor_id", "week_start", "currency"], name: "index_instructor_payouts_unique_week_currency", unique: true
    t.index ["instructor_id"], name: "index_instructor_payouts_on_instructor_id"
    t.index ["studio_id"], name: "index_instructor_payouts_on_studio_id"
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "exp", null: false
    t.string "jti", null: false
    t.datetime "updated_at", null: false
    t.index ["jti"], name: "index_jwt_denylists_on_jti"
  end

  create_table "membership_plans", force: :cascade do |t|
    t.boolean "active", default: false, null: false
    t.boolean "auto_renew", default: true, null: false
    t.datetime "created_at", null: false
    t.string "currency", default: "cad", null: false
    t.text "description"
    t.integer "guest_passes_per_month", default: 0, null: false
    t.boolean "includes_early_booking", default: false, null: false
    t.boolean "includes_priority_booking", default: false, null: false
    t.boolean "includes_retail_discount", default: false, null: false
    t.integer "mat_classes_per_month"
    t.integer "min_commitment_months", default: 3, null: false
    t.string "name", null: false
    t.integer "position", default: 0, null: false
    t.integer "price_cents", default: 0, null: false
    t.integer "private_session_discount_percent", default: 0, null: false
    t.integer "reformer_classes_per_month"
    t.bigint "studio_id", null: false
    t.datetime "updated_at", null: false
    t.index ["studio_id", "position"], name: "index_membership_plans_on_studio_id_and_position"
    t.index ["studio_id"], name: "index_membership_plans_on_studio_id"
  end

  create_table "payment_settings", force: :cascade do |t|
    t.boolean "clients_page_enabled", default: true, null: false
    t.datetime "created_at", null: false
    t.string "dashboard_title", default: "Pilates Studio Dashboard", null: false
    t.string "default_currency", default: "usd"
    t.string "default_theme", default: "dark", null: false
    t.boolean "enabled", default: false, null: false
    t.jsonb "owner_page_layout", default: {}, null: false
    t.string "stripe_publishable_key"
    t.string "stripe_secret_key"
    t.string "stripe_webhook_secret"
    t.bigint "studio_id", null: false
    t.datetime "updated_at", null: false
  end

  create_table "payments", force: :cascade do |t|
    t.integer "amount_cents", default: 0, null: false
    t.bigint "booking_id"
    t.bigint "class_session_id"
    t.bigint "client_id"
    t.datetime "created_at", null: false
    t.string "currency", default: "usd", null: false
    t.text "error_message"
    t.jsonb "raw_response"
    t.string "status", default: "pending", null: false
    t.string "stripe_payment_intent_id"
    t.bigint "studio_id", null: false
    t.datetime "updated_at", null: false
    t.index ["booking_id"], name: "index_payments_on_booking_id"
    t.index ["class_session_id"], name: "index_payments_on_class_session_id"
    t.index ["client_id"], name: "index_payments_on_client_id"
    t.index ["studio_id"], name: "index_payments_on_studio_id"
  end

  create_table "shop_items", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.string "currency", default: "cad", null: false
    t.text "description"
    t.string "image_url"
    t.string "item_type", default: "sale", null: false
    t.integer "price_cents", default: 0, null: false
    t.text "rental_agreement_text"
    t.integer "stock_quantity"
    t.bigint "studio_id", null: false
    t.bigint "studio_location_id"
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["studio_id", "active"], name: "index_shop_items_on_studio_id_and_active"
    t.index ["studio_id"], name: "index_shop_items_on_studio_id"
    t.index ["studio_location_id"], name: "index_shop_items_on_studio_location_id"
  end

  create_table "shop_orders", force: :cascade do |t|
    t.bigint "client_id", null: false
    t.datetime "created_at", null: false
    t.string "currency", default: "cad", null: false
    t.text "notes"
    t.integer "quantity", default: 1, null: false
    t.datetime "rental_agreement_accepted_at"
    t.date "rental_due_date"
    t.date "returned_at"
    t.bigint "shop_item_id", null: false
    t.string "status", default: "pending", null: false
    t.string "stripe_payment_intent_id"
    t.bigint "studio_id", null: false
    t.integer "total_cents", default: 0, null: false
    t.datetime "updated_at", null: false
    t.index ["client_id"], name: "index_shop_orders_on_client_id"
    t.index ["shop_item_id"], name: "index_shop_orders_on_shop_item_id"
    t.index ["studio_id", "status"], name: "index_shop_orders_on_studio_id_and_status"
    t.index ["studio_id"], name: "index_shop_orders_on_studio_id"
  end

  create_table "studio_locations", force: :cascade do |t|
    t.string "address"
    t.string "city"
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.string "state"
    t.bigint "studio_id", null: false
    t.datetime "updated_at", null: false
    t.string "zip"
    t.index ["studio_id"], name: "index_studio_locations_on_studio_id"
  end

  create_table "studio_subscriptions", force: :cascade do |t|
    t.datetime "cancelled_at"
    t.datetime "created_at", null: false
    t.datetime "current_period_end"
    t.text "notes"
    t.string "status", default: "trialing", null: false
    t.string "stripe_customer_id"
    t.string "stripe_subscription_id"
    t.bigint "studio_id", null: false
    t.string "tier", default: "basic", null: false
    t.datetime "updated_at", null: false
    t.index ["studio_id"], name: "index_studio_subscriptions_on_studio_id", unique: true
  end

  create_table "studios", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "invite_code", null: false
    t.string "name", null: false
    t.datetime "onboarding_completed_at"
    t.string "slug"
    t.datetime "updated_at", null: false
    t.index ["invite_code"], name: "index_studios_on_invite_code", unique: true
    t.index ["slug"], name: "index_studios_on_slug", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.boolean "available_for_sessions", default: true, null: false
    t.string "avatar_url"
    t.datetime "created_at", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "instructor_compensation_type", default: "revenue_share", null: false
    t.integer "instructor_default_flat_rate_cents", default: 0, null: false
    t.integer "instructor_default_split_percent", default: 50, null: false
    t.string "name"
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.integer "role"
    t.string "stripe_connect_account_id"
    t.boolean "stripe_connect_onboarding_completed", default: false, null: false
    t.bigint "studio_id", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["stripe_connect_account_id"], name: "index_users_on_stripe_connect_account_id"
    t.index ["studio_id"], name: "index_users_on_studio_id"
  end

  add_foreign_key "bookings", "bundle_purchases"
  add_foreign_key "bookings", "class_sessions"
  add_foreign_key "bookings", "clients"
  add_foreign_key "bookings", "studios"
  add_foreign_key "bundle_products", "class_templates"
  add_foreign_key "bundle_products", "studios"
  add_foreign_key "bundle_products", "users", column: "instructor_id"
  add_foreign_key "bundle_purchases", "bundle_products"
  add_foreign_key "bundle_purchases", "clients"
  add_foreign_key "bundle_purchases", "studios"
  add_foreign_key "class_sessions", "class_templates"
  add_foreign_key "class_sessions", "studios"
  add_foreign_key "class_sessions", "users", column: "instructor_id"
  add_foreign_key "class_templates", "studio_locations"
  add_foreign_key "class_templates", "studios"
  add_foreign_key "class_templates", "users", column: "instructor_id"
  add_foreign_key "client_invitations", "studios"
  add_foreign_key "client_invitations", "users", column: "invited_by_id"
  add_foreign_key "client_memberships", "clients"
  add_foreign_key "client_memberships", "membership_plans"
  add_foreign_key "client_memberships", "studios"
  add_foreign_key "client_notes", "clients"
  add_foreign_key "client_notes", "users", column: "author_id"
  add_foreign_key "client_payment_methods", "clients"
  add_foreign_key "client_payment_methods", "studios"
  add_foreign_key "client_payment_methods", "users"
  add_foreign_key "clients", "studios"
  add_foreign_key "clients", "users"
  add_foreign_key "favorite_class_sessions", "class_sessions"
  add_foreign_key "favorite_class_sessions", "users"
  add_foreign_key "instructor_client_blocks", "clients"
  add_foreign_key "instructor_client_blocks", "studios"
  add_foreign_key "instructor_client_blocks", "users", column: "instructor_id"
  add_foreign_key "instructor_payouts", "studios"
  add_foreign_key "instructor_payouts", "users", column: "created_by_id"
  add_foreign_key "instructor_payouts", "users", column: "instructor_id"
  add_foreign_key "membership_plans", "studios"
  add_foreign_key "payment_settings", "studios"
  add_foreign_key "payments", "bookings"
  add_foreign_key "payments", "class_sessions"
  add_foreign_key "payments", "clients"
  add_foreign_key "payments", "studios"
  add_foreign_key "shop_items", "studio_locations"
  add_foreign_key "studio_locations", "studios"
  add_foreign_key "studio_subscriptions", "studios"
  add_foreign_key "users", "studios"
end
