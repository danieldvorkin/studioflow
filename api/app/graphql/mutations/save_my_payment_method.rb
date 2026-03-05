# frozen_string_literal: true

module Mutations
  class SaveMyPaymentMethod < BaseMutation
    include BillingStudioResolver

    argument :payment_method_id, String, required: true
    argument :studio_id, ID, required: false

    field :client, Types::ClientType, null: true
    field :errors, [ String ], null: false

    def resolve(payment_method_id:, studio_id: nil)
      user = context[:current_user]
      return { client: nil, errors: [ "Not authenticated" ] } unless user

      client, settings, _studio = resolve_billing_studio(user, studio_id: studio_id)

      unless client && settings&.configured?
        return { client: nil, errors: [ "No Stripe-configured studio found for your account" ] }
      end

      return { client: nil, errors: [ "Stripe customer is not initialized" ] } if client.stripe_customer_id.blank?

      Stripe.api_key = settings.stripe_secret_key

      begin
        pm = Stripe::PaymentMethod.retrieve(payment_method_id)

        # Ensure the payment method is attached to this customer
        attached_customer = pm.customer
        if attached_customer.present? && attached_customer != client.stripe_customer_id
          return { client: nil, errors: [ "Payment method belongs to a different customer" ] }
        end

        if attached_customer.blank?
          Stripe::PaymentMethod.attach(payment_method_id, { customer: client.stripe_customer_id })
        end

        Stripe::Customer.update(
          client.stripe_customer_id,
          { invoice_settings: { default_payment_method: payment_method_id } }
        )

        pm = Stripe::PaymentMethod.retrieve(payment_method_id)
        card = pm.card
      rescue Stripe::StripeError => e
        return { client: nil, errors: [ e.message ] }
      end

      begin
        Client.transaction do
          record = ClientPaymentMethod.find_or_initialize_by(
            user_id: user.id,
            stripe_payment_method_id: payment_method_id
          )
          # Keep client_id so booking flows can access payment methods via the Client association,
          # but do NOT stamp studio_id — payment methods are user-scoped, not studio-scoped.
          record.client_id ||= client.id
          record.assign_attributes(
            brand: card&.brand,
            last4: card&.last4,
            exp_month: card&.exp_month,
            exp_year: card&.exp_year,
            default: true
          )
          record.save!

          ClientPaymentMethod.where(user_id: user.id).where.not(id: record.id).update_all(default: false)

          client.update!(
            stripe_default_payment_method_id: payment_method_id,
            stripe_default_payment_method_brand: card&.brand,
            stripe_default_payment_method_last4: card&.last4,
            stripe_default_payment_method_exp_month: card&.exp_month,
            stripe_default_payment_method_exp_year: card&.exp_year
          )
        end
      rescue ActiveRecord::RecordInvalid => e
        return { client: nil, errors: e.record.errors.full_messages }
      end

      { client: client, errors: [] }
    end
  end
end
