module Api
  module V1
    module Client
      class MembershipsController < BaseController
        before_action :require_client!

        # GET /api/v1/client/memberships
        def index
          client = current_user_client
          return render json: { error: "No client profile linked to this account" }, status: :not_found unless client

          memberships = client.client_memberships
                              .includes(:membership_plan)
                              .order(started_at: :desc)

          render json: {
            memberships: memberships.map { |m|
              {
                id:         m.id,
                status:     m.status,
                started_at: m.started_at,
                ends_at:    m.ends_at,
                cancelled_at: m.cancelled_at,
                price_cents: m.price_cents,
                currency:   m.currency,
                plan: {
                  id:   m.membership_plan&.id,
                  name: m.membership_plan&.name,
                  description: m.membership_plan&.description
                }
              }
            },
            meta: { total: memberships.size }
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
