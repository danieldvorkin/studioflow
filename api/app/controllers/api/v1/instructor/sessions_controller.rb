module Api
  module V1
    module Instructor
      class SessionsController < BaseController
        before_action :require_instructor!

        # GET /api/v1/instructor/sessions
        def index
          sessions = current_studio.class_sessions.active
                                   .where(instructor_id: current_user.id)
                                   .includes(:class_template)
                                   .order(:start_time)

          from = params[:from].present? ? Time.zone.parse(params[:from]) : Time.zone.now.beginning_of_day
          sessions = sessions.where("start_time >= ?", from)

          if params[:to].present?
            sessions = sessions.where("start_time <= ?", Time.zone.parse(params[:to]))
          end

          render json: {
            sessions: sessions.map { |s| serialize_session(s) },
            meta: { total: sessions.size }
          }
        end

        # GET /api/v1/instructor/sessions/:id/bookings
        def bookings
          session = current_studio.class_sessions
                                  .where(instructor_id: current_user.id)
                                  .includes(:class_template, bookings: :client)
                                  .find(params[:session_id])

          render json: {
            session: { id: session.id, start_time: session.start_time, title: session.class_template&.title },
            bookings: session.bookings.where(archived: false, status: [ :booked, :waitlisted ]).map { |b|
              {
                id:          b.id,
                slug:        b.slug,
                status:      b.status,
                client_name: b.client&.name,
                client_id:   b.client_id
              }
            }
          }
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Session not found or does not belong to you" }, status: :not_found
        end

        private

        def require_instructor!
          unless current_user.instructor? || current_user.owner? || current_user.staff?
            render json: { error: "Forbidden — requires instructor role" }, status: :forbidden
          end
        end

        def serialize_session(s)
          tpl = s.class_template
          {
            id:              s.id,
            start_time:      s.start_time,
            end_time:        s.effective_end_time,
            room:            s.room,
            capacity:        s.capacity || tpl&.capacity,
            seats_available: s.seats_available,
            title:           tpl&.title
          }
        end
      end
    end
  end
end
