module Types
  class UserType < Types::BaseObject
    field :id, ID, null: false
    field :studio_id, ID, null: false
    field :email, String, null: false
    field :name, String, null: true
    field :avatar_url, String, null: true
    field :role, Integer, null: true
    field :role_name, String, null: true
    field :godmode, Boolean, null: false, method: :godmode?
    field :active, Boolean, null: false
    field :available_for_sessions, Boolean, null: false

    field :instructor_compensation_type, String, null: false
    field :instructor_default_split_percent, Integer, null: false
    field :instructor_default_flat_rate_cents, Integer, null: false

    field :stripe_connect_account_id, String, null: true
    field :stripe_connect_onboarding_completed, Boolean, null: false
  end
end
