# frozen_string_literal: true

module Mutations
  class SetMyDefaultPaymentMethod < BaseMutation
    include BillingStudioResolver

    argument :payment_method_id, String, required: true
    argument :studio_id, ID, required: false

    field :client, Types::ClientType, null: true
    field :errors, [ String ], null: false

    def resolve(payment_method_id:, studio_id: nil)
      user = context[:current_user]
      return { client: nil, errors: [ "Not authenticated" ] } unless user

      record = ClientPaymentMethod.find_by(user_id: user.id, stripe_payment_method_id: payment_method_id)
      return { client: nil, errors: [ "Payment method not found" ] } unless record

      # Resolve a Stripe-configured client/studio for this user
      client, settings, _studio = resolve_billing_studio(user, studio_id: studio_id)
      unless client && settings&.configured?
        return { client: nil, errors: [ "No Stripe-configured studio found for your account" ] }
      end

      return { client: nil, errors: [ "Stripe customer is not initialized" ] } if client.stripe_customer_id.blank?

      Stripe.api_key = settings.stripe_secret_key

      begin
        Stripe::Customer.update(
          client.stripe_customer_id,
          { invoice_settings: { default_payment_method: payment_method_id } }
        )
      rescue Stripe::StripeError => e
        return { client: nil, errors: [ e.message ] }
      end

      Client.transaction do
        ClientPaymentMethod.where(user_id: user.id).update_all(default: false)
        record.update!(default: true)

        client.update!(
          stripe_default_payment_method_id: record.stripe_payment_method_id,
          stripe_default_payment_method_brand: record.brand,
          stripe_default_payment_method_last4: record.last4,
          stripe_default_payment_method_exp_month: record.exp_month,
          stripe_default_payment_method_exp_year: record.exp_year
        )
      end

      { client: client, errors: [] }
    end
  end
end
