module Api
  module V1
    module Client
      class BundlePurchasesController < BaseController
        before_action :require_client!

        # GET /api/v1/client/bundle_purchases
        def index
          client = current_user_client
          return render json: { error: "No client profile linked to this account" }, status: :not_found unless client

          purchases = client.bundle_purchases
                            .includes(:bundle_product)
                            .order(created_at: :desc)

          render json: {
            bundle_purchases: purchases.map { |p|
              {
                id:                p.id,
                status:            p.status,
                credits_total:     p.credits_total,
                credits_remaining: p.credits_remaining,
                price_cents:       p.price_cents,
                currency:          p.currency,
                created_at:        p.created_at,
                product: {
                  id:    p.bundle_product&.id,
                  title: p.bundle_product&.title
                }
              }
            },
            meta: { total: purchases.size }
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
