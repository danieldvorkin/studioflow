# frozen_string_literal: true

module Mutations
  class CreatePlatformSubscriptionCheckout < BaseMutation
    argument :tier, String, required: true
    argument :currency, String, required: false, default_value: "cad"
    argument :billing_interval, String, required: false, default_value: "month"

    field :checkout_url, String, null: true
    field :errors, [ String ], null: false

    TIER_PRICE_ENV = {
      [ "pro",    "cad", "month" ] => "PLATFORM_STRIPE_PRICE_PRO_CAD",
      [ "pro",    "cad", "year"  ] => "PLATFORM_STRIPE_PRICE_PRO_YEARLY_CAD",
      [ "pro",    "usd", "month" ] => "PLATFORM_STRIPE_PRICE_PRO",
      [ "pro",    "usd", "year"  ] => "PLATFORM_STRIPE_PRICE_PRO_YEARLY",
      [ "studio", "cad", "month" ] => "PLATFORM_STRIPE_PRICE_STUDIO_CAD",
      [ "studio", "cad", "year"  ] => "PLATFORM_STRIPE_PRICE_STUDIO_YEARLY_CAD",
      [ "studio", "usd", "month" ] => "PLATFORM_STRIPE_PRICE_STUDIO",
      [ "studio", "usd", "year"  ] => "PLATFORM_STRIPE_PRICE_STUDIO_YEARLY",
      # Legacy keys
      [ "basic",   "usd", "month" ] => "PLATFORM_STRIPE_PRICE_BASIC",
      [ "premium", "usd", "month" ] => "PLATFORM_STRIPE_PRICE_PREMIUM",
      [ "basic",   "cad", "month" ] => "PLATFORM_STRIPE_PRICE_PRO_CAD",
      [ "premium", "cad", "month" ] => "PLATFORM_STRIPE_PRICE_STUDIO_CAD"
    }.freeze

    def resolve(tier:, currency: "cad", billing_interval: "month")
      currency = currency.to_s.downcase
      currency = "cad" unless %w[cad usd].include?(currency)
      billing_interval = billing_interval.to_s.downcase
      billing_interval = "month" unless %w[month year].include?(billing_interval)

      user = context[:current_user]
      return { checkout_url: nil, errors: [ "Not authenticated" ] } unless user
      return { checkout_url: nil, errors: [ "Not authorized" ] } unless user.owner? && !user.godmode?

      unless StudioSubscription::TIERS.include?(tier)
        return { checkout_url: nil, errors: [ "Invalid tier" ] }
      end

      studio = user.studio
      sub = StudioSubscription.find_or_initialize_by(studio_id: studio.id)

      # Guard against re-subscribing to the same active tier
      if sub.persisted? && sub.active? && sub.tier == tier
        return { checkout_url: nil, errors: [ "You already have an active #{tier} subscription" ] }
      end

      web_url = ENV["WEB_APP_URL"].presence || "http://localhost:5173"

      # Starter is free — skip Stripe, update record directly and redirect back
      if tier == "starter"
        sub.tier = "starter"
        sub.status = "active"
        sub.stripe_subscription_id = nil
        sub.current_period_end = nil
        sub.cancelled_at = nil
        sub.save!
        return { checkout_url: "#{web_url}/owner/subscription?checkout_success=1", errors: [] }
      end

      platform_key = ENV["PLATFORM_STRIPE_SECRET_KEY"].presence
      return { checkout_url: nil, errors: [ "Platform Stripe is not configured" ] } unless platform_key

      price_env_key = TIER_PRICE_ENV[[ tier, currency, billing_interval ]]
      price_id = price_env_key && ENV[price_env_key].presence
      return { checkout_url: nil, errors: [ "Stripe price for #{tier} tier (#{currency.upcase} #{billing_interval}ly) is not configured" ] } unless price_id

      Stripe.api_key = platform_key

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
          success_url: "#{web_url}/owner/subscription?checkout_success=1&session_id={CHECKOUT_SESSION_ID}",
          cancel_url: "#{web_url}/owner/subscription?checkout_cancelled=1",
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
