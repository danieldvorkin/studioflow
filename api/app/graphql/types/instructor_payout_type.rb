module Types
  class InstructorPayoutType < Types::BaseObject
    field :id, ID, null: false
    field :instructor, Types::UserType, null: false
    field :created_by, Types::UserType, null: false

    field :week_start, GraphQL::Types::ISO8601Date, null: false
    field :week_end, GraphQL::Types::ISO8601Date, null: false
    field :currency, String, null: false

    field :gross_cents, Integer, null: false
    field :instructor_earnings_cents, Integer, null: false
    field :studio_cut_cents, Integer, null: false

    field :status, String, null: false
    field :paid_at, GraphQL::Types::ISO8601DateTime, null: true

    field :paid_method, String, null: true
    field :paid_reference, String, null: true
    field :paid_notes, String, null: true

    field :stripe_transfer_id, String, null: true
    field :calculation_snapshot, GraphQL::Types::JSON, null: true

    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
