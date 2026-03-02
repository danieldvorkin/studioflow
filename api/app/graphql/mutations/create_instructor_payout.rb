module Mutations
  class CreateInstructorPayout < BaseMutation
    argument :instructor_id, ID, required: true
    argument :week_start, GraphQL::Types::ISO8601Date, required: true
    argument :week_end, GraphQL::Types::ISO8601Date, required: false
    argument :currency, String, required: true

    field :payout, Types::InstructorPayoutType, null: true
    field :errors, [String], null: false

    def resolve(instructor_id:, week_start:, week_end: nil, currency:)
      user = context[:current_user]
      raise Pundit::NotAuthorizedError unless user&.owner?

      instructor = User.where(studio_id: user.studio_id).find_by(id: instructor_id)
      return { payout: nil, errors: ['Instructor not found'] } unless instructor&.instructor?

      calculator = InstructorPayouts::WeeklyEarningsCalculator.new(
        week_start: week_start,
        week_end: week_end,
        instructor_id: instructor.id,
        currency: currency,
        studio_id: user.studio_id
      )

      result = calculator.call.first
      return { payout: nil, errors: ['No earnings found for this week'] } unless result

      if result.gross_cents.to_i <= 0 && result.instructor_earnings_cents.to_i <= 0
        return { payout: nil, errors: ['No earnings found for this week'] }
      end

      payout = InstructorPayout.new(
        studio_id: user.studio_id,
        instructor: instructor,
        created_by: user,
        week_start: result.week_start,
        week_end: result.week_end,
        currency: result.currency,
        gross_cents: result.gross_cents,
        instructor_earnings_cents: result.instructor_earnings_cents,
        studio_cut_cents: result.studio_cut_cents,
        status: 'draft',
        calculation_snapshot: {
          weekStart: result.week_start,
          weekEnd: result.week_end,
          currency: result.currency,
          grossCents: result.gross_cents,
          instructorEarningsCents: result.instructor_earnings_cents,
          studioCutCents: result.studio_cut_cents,
          paymentsCount: result.payments_count,
          sessionsTaughtCount: result.sessions_taught_count,
          templateBreakdown: result.template_breakdown.map do |row|
            {
              classTemplateId: row[:template].id,
              title: row[:template].title,
              grossCents: row[:gross_cents],
              instructorEarningsCents: row[:instructor_earnings_cents]
            }
          end
        }
      )

      if payout.save
        { payout: payout, errors: [] }
      else
        { payout: nil, errors: payout.errors.full_messages }
      end
    end
  end
end
