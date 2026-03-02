# frozen_string_literal: true

module Mutations
  class SaveMyPaymentMethod < BaseMutation
    argument :payment_method_id, String, required: true
    argument :studio_id, ID, required: false

    field :client, Types::ClientType, null: true
    field :errors, [ String ], null: false

    def resolve(payment_method_id:, studio_id: nil)
      user = context[:current_user]
      return { client: nil, errors: [ "Not authenticated" ] } unless user

      effective_studio_id = user.client? ? (studio_id.presence || user.studio_id) : user.studio_id
      studio = Studio.find(effective_studio_id)

      settings = PaymentSetting.instance_for(studio)
      unless settings.configured?
        return { client: nil, errors: [ "Stripe is not configured" ] }
      end

      client = Client.find_by(user_id: user.id, studio_id: effective_studio_id)
      return { client: nil, errors: [ "Client record not found" ] } unless client

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

      Client.transaction do
        record = client.client_payment_methods.find_or_initialize_by(
          stripe_payment_method_id: payment_method_id
        )
        record.studio_id ||= effective_studio_id
        record.assign_attributes(
          brand: card&.brand,
          last4: card&.last4,
          exp_month: card&.exp_month,
          exp_year: card&.exp_year,
          default: true
        )
        record.save!

        client.client_payment_methods.where.not(id: record.id).update_all(default: false)

        client.update!(
          stripe_default_payment_method_id: payment_method_id,
          stripe_default_payment_method_brand: card&.brand,
          stripe_default_payment_method_last4: card&.last4,
          stripe_default_payment_method_exp_month: card&.exp_month,
          stripe_default_payment_method_exp_year: card&.exp_year
        )
      end

      { client: client, errors: [] }
    end
  end
end
