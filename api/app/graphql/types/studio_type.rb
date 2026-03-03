module Types
  class StudioType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :slug, String, null: true
    field :invite_code, String, null: true
    field :onboarding_completed_at, GraphQL::Types::ISO8601DateTime, null: true
    field :onboarding_completed, Boolean, null: false
    field :studio_subscription, Types::StudioSubscriptionType, null: true

    # Rich show-page fields
    field :instructors, [ Types::UserType ], null: false
    field :studio_locations, [ Types::StudioLocationType ], null: false
    field :membership_plans, [ Types::MembershipPlanType ], null: false
    field :upcoming_class_sessions, [ Types::ClassSessionType ], null: false do
      argument :limit, Integer, required: false, default_value: 20
    end

    def onboarding_completed
      object.onboarding_completed_at.present?
    end

    def instructors
      object.users.where(role: User::ROLES[:instructor]).order(:name)
    end

    def studio_locations
      object.studio_locations.order(:name)
    end

    def membership_plans
      object.membership_plans.where(active: true).order(:position, :name)
    end

    def upcoming_class_sessions(limit:)
      now = Time.current
      object.class_sessions
            .where("start_time >= ?", now)
            .where("start_time <= ?", now + 14.days)
            .order(:start_time)
            .limit(limit)
    end
  end
end
