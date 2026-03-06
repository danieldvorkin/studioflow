module Api
  module V1
    module Client
      class BookingsController < BaseController
        before_action :require_client!

        # GET /api/v1/client/bookings
        def index
          client = current_user_client
          return render json: { error: "No client profile linked to this account" }, status: :not_found unless client

          bookings = client.bookings.where(archived: false)
                          .includes(class_session: :class_template)
                          .order("class_sessions.start_time DESC")

          render json: {
            bookings: bookings.map { |b|
              {
                id:         b.id,
                slug:       b.slug,
                status:     b.status,
                paid:       b.paid,
                price_cents: b.price_cents,
                session: {
                  id:         b.class_session.id,
                  start_time: b.class_session.start_time,
                  end_time:   b.class_session.effective_end_time,
                  title:      b.class_session.class_template&.title
                },
                created_at: b.created_at
              }
            },
            meta: { total: bookings.size }
          }
        end

        private

        def require_client!
          unless current_user.client? || current_user.owner? || current_user.staff?
            render json: { error: "Forbidden — requires client role" }, status: :forbidden
          end
        end

        def current_user_client
          current_studio.clients.find_by(user_id: current_user.id)
        end
      end
    end
  end
end
