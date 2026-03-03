module Types
  class StudioType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :slug, String, null: true
    field :invite_code, String, null: true
    field :onboarding_completed_at, GraphQL::Types::ISO8601DateTime, null: true
    field :onboarding_completed, Boolean, null: false
    field :studio_subscription, Types::StudioSubscriptionType, null: true

    def onboarding_completed
      object.onboarding_completed_at.present?
    end
  end
end
