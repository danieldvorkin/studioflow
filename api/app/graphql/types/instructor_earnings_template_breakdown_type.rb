module Types
  class InstructorEarningsTemplateBreakdownType < Types::BaseObject
    field :class_template, Types::ClassTemplateType, null: false
    field :gross_cents, Integer, null: false
    field :instructor_earnings_cents, Integer, null: false
  end
end
