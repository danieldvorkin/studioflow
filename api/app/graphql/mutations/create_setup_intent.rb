# frozen_string_literal: true

module Mutations
  class CreateSetupIntent < BaseMutation
    argument :studio_id, ID, required: false

    field :client_secret, String, null: true
    field :client, Types::ClientType, null: true
    field :errors, [String], null: false

    def resolve(studio_id: nil)
      user = context[:current_user]
      return { client_secret: nil, client: nil, errors: ["Not authenticated"] } unless user

      effective_studio_id = user.client? ? (studio_id.presence || user.studio_id) : user.studio_id
      studio = Studio.find(effective_studio_id)

      settings = PaymentSetting.instance_for(studio)
      unless settings.configured?
        return { client_secret: nil, client: nil, errors: ["Stripe is not configured"] }
      end

      client = Client.find_by(user_id: user.id, studio_id: effective_studio_id)
      return { client_secret: nil, client: nil, errors: ["Client record not found"] } unless client

      Stripe.api_key = settings.stripe_secret_key

      begin
        if client.stripe_customer_id.blank?
          customer = Stripe::Customer.create(
            email: client.email,
            name: client.name,
            metadata: { user_id: user.id, client_id: client.id }
          )
          client.update!(stripe_customer_id: customer.id)
        end

        intent = Stripe::SetupIntent.create(
          customer: client.stripe_customer_id,
          usage: "off_session",
          payment_method_types: ["card"],
          metadata: { user_id: user.id, client_id: client.id }
        )
      rescue Stripe::StripeError => e
        return { client_secret: nil, client: nil, errors: [e.message] }
      end

      { client_secret: intent.client_secret, client: client, errors: [] }
    end
  end
end
