# frozen_string_literal: true

module Mutations
  class CreatePlatformSubscriptionCheckout < BaseMutation
    argument :tier, String, required: true

    field :checkout_url, String, null: true
    field :errors, [ String ], null: false

    TIER_PRICE_ENV = {
      "starter" => nil,                            # free — no Stripe price needed
      "pro"     => "PLATFORM_STRIPE_PRICE_PRO",
      "studio"  => "PLATFORM_STRIPE_PRICE_STUDIO",
      # Legacy keys kept for existing production subscriptions
      "basic"   => "PLATFORM_STRIPE_PRICE_BASIC",
      "premium" => "PLATFORM_STRIPE_PRICE_PREMIUM"
    }.freeze

    def resolve(tier:)
      user = context[:current_user]
      return { checkout_url: nil, errors: [ "Not authenticated" ] } unless user
      return { checkout_url: nil, errors: [ "Not authorized" ] } unless user.owner? && !user.godmode?

      unless StudioSubscription::TIERS.include?(tier)
        return { checkout_url: nil, errors: [ "Invalid tier" ] }
      end

      platform_key = ENV["PLATFORM_STRIPE_SECRET_KEY"].presence
      return { checkout_url: nil, errors: [ "Platform Stripe is not configured" ] } unless platform_key

      price_id = ENV[TIER_PRICE_ENV[tier]].presence
      return { checkout_url: nil, errors: [ "Stripe price for #{tier} tier is not configured" ] } unless price_id

      studio = user.studio
      sub = StudioSubscription.find_or_initialize_by(studio_id: studio.id)

      # Guard against re-subscribing to the same active tier
      if sub.persisted? && sub.active? && sub.tier == tier
        return { checkout_url: nil, errors: [ "You already have an active #{tier} subscription" ] }
      end

      Stripe.api_key = platform_key

      web_url = ENV["WEB_APP_URL"].presence || "http://localhost:5173"

      begin
        # Create or reuse Stripe customer
        customer_id = sub.stripe_customer_id.presence
        unless customer_id
          customer = Stripe::Customer.create(
            email: user.email,
            name: studio.name,
            metadata: { studio_id: studio.id, tier: tier }
          )
          customer_id = customer.id
          sub.stripe_customer_id = customer_id
          sub.tier = tier
          sub.status = "trialing"
          sub.save!
        end

        session = Stripe::Checkout::Session.create(
          mode: "subscription",
          customer: customer_id,
          line_items: [
            { price: price_id, quantity: 1 }
          ],
          success_url: "#{web_url}/subscription?checkout_success=1&session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "#{web_url}/subscription?checkout_cancelled=1",
          subscription_data: {
            trial_period_days: 7,
            metadata: {
              studio_id: studio.id,
              tier: tier
            }
          },
          metadata: {
            studio_id: studio.id,
            tier: tier
          },
          allow_promotion_codes: true
        )

        { checkout_url: session.url, errors: [] }
      rescue Stripe::StripeError => e
        { checkout_url: nil, errors: [ e.message ] }
      end
    end
  end
end
