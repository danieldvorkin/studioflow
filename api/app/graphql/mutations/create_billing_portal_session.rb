# frozen_string_literal: true

module Mutations
  class CreateBillingPortalSession < BaseMutation
    field :portal_url, String, null: true
    field :errors, [ String ], null: false

    def resolve
      user = context[:current_user]
      return { portal_url: nil, errors: [ "Not authenticated" ] } unless user
      return { portal_url: nil, errors: [ "Not authorized" ] } unless user.owner? && !user.godmode?

      platform_key = ENV["PLATFORM_STRIPE_SECRET_KEY"].presence
      return { portal_url: nil, errors: [ "Platform Stripe is not configured" ] } unless platform_key

      studio = user.studio
      sub = StudioSubscription.find_by(studio_id: studio.id)
      customer_id = sub&.stripe_customer_id.presence
      return { portal_url: nil, errors: [ "No billing account found. Please subscribe first." ] } unless customer_id

      Stripe.api_key = platform_key
      web_url = ENV["WEB_APP_URL"].presence || "http://localhost:5173"

      session = Stripe::BillingPortal::Session.create(
        customer: customer_id,
        return_url: "#{web_url}/owner/subscription"
      )

      { portal_url: session.url, errors: [] }
    rescue Stripe::StripeError => e
      { portal_url: nil, errors: [ e.message ] }
    end
  end
end
