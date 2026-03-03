# frozen_string_literal: true

module Mutations
  class SaveOwnerPaymentMethod < BaseMutation
    argument :payment_method_id, String, required: true

    field :stripe_customer_id, String, null: true
    field :errors, [ String ], null: false

    def resolve(payment_method_id:)
      user = context[:current_user]
      return { stripe_customer_id: nil, errors: [ "Not authenticated" ] } unless user
      return { stripe_customer_id: nil, errors: [ "Not authorized" ] } unless user.owner? && !user.godmode?

      platform_key = ENV["PLATFORM_STRIPE_SECRET_KEY"].presence
      return { stripe_customer_id: nil, errors: [ "Platform Stripe is not configured" ] } unless platform_key

      studio = user.studio
      sub = StudioSubscription.find_by(studio_id: studio.id)
      customer_id = sub&.stripe_customer_id.presence
      return { stripe_customer_id: nil, errors: [ "No billing account found. Please create a setup intent first." ] } unless customer_id

      Stripe.api_key = platform_key

      begin
        pm = Stripe::PaymentMethod.retrieve(payment_method_id)

        attached_customer = pm.customer
        if attached_customer.present? && attached_customer != customer_id
          return { stripe_customer_id: nil, errors: [ "Payment method belongs to a different customer" ] }
        end

        if attached_customer.blank?
          Stripe::PaymentMethod.attach(payment_method_id, { customer: customer_id })
        end

        Stripe::Customer.update(
          customer_id,
          { invoice_settings: { default_payment_method: payment_method_id } }
        )

        # If they have a Stripe subscription, also set the default there
        if sub.stripe_subscription_id.present?
          Stripe::Subscription.update(
            sub.stripe_subscription_id,
            { default_payment_method: payment_method_id }
          )
        end
      rescue Stripe::StripeError => e
        return { stripe_customer_id: nil, errors: [ e.message ] }
      end

      { stripe_customer_id: customer_id, errors: [] }
    end
  end
end
