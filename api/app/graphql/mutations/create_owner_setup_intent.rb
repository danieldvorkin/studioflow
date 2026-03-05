# frozen_string_literal: true

module Mutations
  class CreateOwnerSetupIntent < BaseMutation
    field :client_secret, String, null: true
    field :errors, [ String ], null: false

    def resolve
      user = context[:current_user]
      return { client_secret: nil, errors: [ "Not authenticated" ] } unless user
      return { client_secret: nil, errors: [ "Not authorized" ] } unless user.owner? && !user.godmode?

      platform_key = ENV["PLATFORM_STRIPE_SECRET_KEY"].presence
      return { client_secret: nil, errors: [ "Platform Stripe is not configured" ] } unless platform_key

      studio = user.studio
      sub = StudioSubscription.find_or_initialize_by(studio_id: studio.id)

      Stripe.api_key = platform_key

      begin
        unless sub.stripe_customer_id.present?
          customer = Stripe::Customer.create(
            email: user.email,
            name: studio.name,
            metadata: { studio_id: studio.id }
          )
          sub.stripe_customer_id = customer.id
          sub.tier   ||= "starter"
          sub.status ||= "trialing"
          sub.save!
        end

        intent = Stripe::SetupIntent.create(
          customer: sub.stripe_customer_id,
          usage: "off_session",
          payment_method_types: [ "card" ],
          metadata: { studio_id: studio.id, owner_user_id: user.id }
        )
      rescue Stripe::StripeError => e
        return { client_secret: nil, errors: [ e.message ] }
      end

      { client_secret: intent.client_secret, errors: [] }
    end
  end
end
