module Types
  class InstructorEarningsWeekType < Types::BaseObject
    field :instructor, Types::UserType, null: false
    field :currency, String, null: false
    field :week_start, GraphQL::Types::ISO8601Date, null: false
    field :week_end, GraphQL::Types::ISO8601Date, null: false

    field :gross_cents, Integer, null: false
    field :instructor_earnings_cents, Integer, null: false
    field :studio_cut_cents, Integer, null: false

    field :sessions_taught_count, Integer, null: false
    field :payments_count, Integer, null: false

    field :template_breakdown, [Types::InstructorEarningsTemplateBreakdownType], null: false

    field :existing_payout, Types::InstructorPayoutType, null: true
  end
end
