module Api
  module V1
    class SessionsController < BaseController
      before_action :require_owner_or_staff!

      # GET /api/v1/sessions
      # Query params:
      #   from  (ISO8601 date, default: today)
      #   to    (ISO8601 date)
      #   per_page (integer, default: 25, max: 100)
      #   page  (integer, default: 1)
      def index
        sessions = current_studio.class_sessions.active
                                 .includes(:class_template, :instructor)
                                 .order(:start_time)

        from = params[:from].present? ? Time.zone.parse(params[:from]) : Time.zone.now.beginning_of_day
        sessions = sessions.where("start_time >= ?", from) if from

        if params[:to].present?
          to = Time.zone.parse(params[:to])
          sessions = sessions.where("start_time <= ?", to)
        end

        per_page = [ [ params.fetch(:per_page, 25).to_i, 1 ].max, 100 ].min
        page     = [ params.fetch(:page, 1).to_i, 1 ].max
        total    = sessions.count
        sessions = sessions.offset((page - 1) * per_page).limit(per_page)

        render json: {
          sessions: sessions.map { |s| serialize_session(s) },
          meta: { total: total, page: page, per_page: per_page }
        }
      end

      # GET /api/v1/sessions/:id
      def show
        session = current_studio.class_sessions.includes(:class_template, :instructor, bookings: :client).find(params[:id])

        render json: {
          session: serialize_session(session).merge(
            bookings: session.bookings.where(archived: false).map { |b|
              {
                id:         b.id,
                slug:       b.slug,
                status:     b.status,
                paid:       b.paid,
                client_id:  b.client_id,
                client_name: b.client&.name,
                created_at: b.created_at
              }
            }
          )
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Session not found" }, status: :not_found
      end

      private

      def require_owner_or_staff!
        unless current_user.owner? || current_user.staff?
          render json: { error: "Forbidden — requires owner or staff role" }, status: :forbidden
        end
      end

      def serialize_session(s)
        tpl = s.class_template
        {
          id:               s.id,
          start_time:       s.start_time,
          end_time:         s.effective_end_time,
          room:             s.room,
          capacity:         s.capacity || tpl&.capacity,
          seats_available:  s.seats_available,
          bundle_enabled:   s.bundle_enabled,
          bundle_spots:     s.bundle_spots,
          class_template: {
            id:    tpl&.id,
            title: tpl&.title
          },
          instructor: s.instructor ? { id: s.instructor.id, name: s.instructor.name } : nil
        }
      end
    end
  end
end
