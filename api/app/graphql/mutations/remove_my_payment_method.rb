# frozen_string_literal: true

module Mutations
  class RemoveMyPaymentMethod < BaseMutation
    argument :payment_method_id, String, required: false
    argument :studio_id, ID, required: false

    field :client, Types::ClientType, null: true
    field :errors, [ String ], null: false

    def resolve(payment_method_id: nil, studio_id: nil)
      user = context[:current_user]
      return { client: nil, errors: [ "Not authenticated" ] } unless user

      # For remove, we only need a valid client record — find any of the user's clients
      # to anchor the default-PM update. Prefer the one from the user's primary studio.
      client = Client.find_by(user_id: user.id, studio_id: studio_id.presence || user.studio_id) ||
               Client.find_by(user_id: user.id)
      return { client: nil, errors: [ "Client record not found" ] } unless client

      target_id = payment_method_id.presence || client.stripe_default_payment_method_id
      return { client: client, errors: [ "No saved card on file" ] } if target_id.blank?

      record = ClientPaymentMethod.find_by(user_id: user.id, stripe_payment_method_id: target_id)

      Client.transaction do
        record&.destroy!

        # Choose a new default if the removed one was default (or if client points to it)
        next_default = ClientPaymentMethod.where(user_id: user.id).where.not(stripe_payment_method_id: target_id).order(created_at: :desc).first

        if next_default
          ClientPaymentMethod.where(user_id: user.id).update_all(default: false)
          next_default.update!(default: true)

          client.update!(
            stripe_default_payment_method_id: next_default.stripe_payment_method_id,
            stripe_default_payment_method_brand: next_default.brand,
            stripe_default_payment_method_last4: next_default.last4,
            stripe_default_payment_method_exp_month: next_default.exp_month,
            stripe_default_payment_method_exp_year: next_default.exp_year
          )
        else
          client.update!(
            stripe_default_payment_method_id: nil,
            stripe_default_payment_method_brand: nil,
            stripe_default_payment_method_last4: nil,
            stripe_default_payment_method_exp_month: nil,
            stripe_default_payment_method_exp_year: nil
          )
        end
      end

      billing_settings = PaymentSetting.instance_for(client.studio)
      if billing_settings.configured? && client.stripe_customer_id.present?
        Stripe.api_key = billing_settings.stripe_secret_key
        begin
          Stripe::Customer.update(
            client.stripe_customer_id,
            { invoice_settings: { default_payment_method: client.stripe_default_payment_method_id } }
          )
        rescue Stripe::StripeError
          # ignore stripe update failures; local state is authoritative for UI
        end
      end
      { client: client, errors: [] }
    end
  end
end
