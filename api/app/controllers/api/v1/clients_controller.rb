module Api
  module V1
    class ClientsController < BaseController
      before_action :require_owner_or_staff!

      # GET /api/v1/clients
      def index
        clients = current_studio.clients.order(:name)

        render json: {
          clients: clients.map { |c| serialize_client(c) },
          meta: { total: clients.size }
        }
      end

      # GET /api/v1/clients/:id
      def show
        client = current_studio.clients.find(params[:id])

        render json: {
          client: serialize_client(client).merge(
            bookings_count:   client.bookings.where(archived: false).count,
            memberships:      client.client_memberships.map { |m|
              { id: m.id, status: m.status, started_at: m.started_at, ends_at: m.ends_at }
            }
          )
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Client not found" }, status: :not_found
      end

      private

      def require_owner_or_staff!
        unless current_user.owner? || current_user.staff?
          render json: { error: "Forbidden — requires owner or staff role" }, status: :forbidden
        end
      end

      def serialize_client(client)
        {
          id:    client.id,
          name:  client.name,
          email: client.email,
          phone: client.phone,
          created_at: client.created_at
        }
      end
    end
  end
end
