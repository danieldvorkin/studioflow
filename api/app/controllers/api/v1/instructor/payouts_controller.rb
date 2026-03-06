module Api
  module V1
    module Instructor
      class PayoutsController < BaseController
        before_action :require_instructor!

        # GET /api/v1/instructor/payouts
        def index
          payouts = InstructorPayout.where(studio: current_studio, instructor_id: current_user.id)
                                    .order(week_start: :desc)

          render json: {
            payouts: payouts.map { |p| serialize_payout(p) },
            meta: { total: payouts.size }
          }
        end

        private

        def require_instructor!
          unless current_user.instructor? || current_user.owner? || current_user.staff?
            render json: { error: "Forbidden — requires instructor role" }, status: :forbidden
          end
        end

        def serialize_payout(p)
          {
            id:                       p.id,
            week_start:               p.week_start,
            week_end:                 p.week_end,
            status:                   p.status,
            currency:                 p.currency,
            gross_cents:              p.gross_cents,
            instructor_earnings_cents: p.instructor_earnings_cents,
            studio_cut_cents:         p.studio_cut_cents,
            paid_at:                  p.paid_at,
            paid_method:              p.paid_method
          }
        end
      end
    end
  end
end
