module Mutations
  class PurchaseBundleProduct < BaseMutation
    argument :bundle_product_id, ID, required: true
    argument :client_id, ID, required: false
    argument :payment_method_id, String, required: false

    field :bundle_purchase, Types::BundlePurchaseType, null: true
    field :errors, [ String ], null: false

    def resolve(bundle_product_id:, client_id: nil, payment_method_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authenticated" unless user
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, BundlePurchase).create?

      bundle_product =
        if user.client?
          BundleProduct.where(active: true).find(bundle_product_id)
        else
          BundleProduct.where(studio_id: user.studio_id, active: true).find(bundle_product_id)
        end

      studio = Studio.find(bundle_product.studio_id)
      settings = PaymentSetting.instance_for(studio)
      unless settings.configured?
        return { bundle_purchase: nil, errors: [ "Stripe is not configured" ] }
      end

      client =
        if user.client?
          if client_id.present?
            Client.where(studio_id: bundle_product.studio_id).find(client_id)
          else
            Client.find_or_initialize_by(user_id: user.id, studio_id: bundle_product.studio_id).tap do |c|
              c.name ||= user.name
              c.email ||= user.email
              c.save!
            end
          end
        else
          return { bundle_purchase: nil, errors: [ "Client is required" ] } if client_id.blank?
          Client.where(studio_id: user.studio_id).find(client_id)
        end

      if user.client? && client.user_id != user.id
        return { bundle_purchase: nil, errors: [ "Not authorized" ] }
      end

      payment_method_id ||= client.stripe_default_payment_method_id
      if payment_method_id.blank?
        return { bundle_purchase: nil, errors: [ "No payment method provided" ] }
      end

      Stripe.api_key = settings.stripe_secret_key

      begin
        intent_params = {
          amount: bundle_product.price_cents,
          currency: bundle_product.currency,
          payment_method: payment_method_id,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: "never"
          },
          metadata: {
            bundle_product_id: bundle_product.id,
            client_id: client.id,
            user_id: user.id
          }
        }

        intent_params[:customer] = client.stripe_customer_id if client.stripe_customer_id.present?

        intent = Stripe::PaymentIntent.create(intent_params)
      rescue Stripe::StripeError => e
        return { bundle_purchase: nil, errors: [ e.message ] }
      end

      unless intent.status == "succeeded"
        return { bundle_purchase: nil, errors: [ "Payment did not succeed (status: #{intent.status})" ] }
      end

      purchase = nil
      BundlePurchase.transaction do
        purchase = BundlePurchase.create!(
          studio_id: bundle_product.studio_id,
          client: client,
          bundle_product: bundle_product,
          status: "succeeded",
          credits_total: bundle_product.credits_count,
          credits_remaining: bundle_product.credits_count,
          price_cents: bundle_product.price_cents,
          unit_price_cents: bundle_product.unit_price_cents,
          remainder_cents: bundle_product.remainder_cents,
          currency: bundle_product.currency,
          stripe_payment_intent_id: intent.id,
          raw_response: intent.to_hash
        )
      end

      { bundle_purchase: purchase, errors: [] }
    end
  end
end
