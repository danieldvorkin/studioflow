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

      effective_studio_id = user.client? ? (studio_id.presence || user.studio_id) : user.studio_id
      client = Client.find_by(user_id: user.id, studio_id: effective_studio_id)
      return { client: nil, errors: [ "Client record not found" ] } unless client

      target_id = payment_method_id.presence || client.stripe_default_payment_method_id
      return { client: client, errors: [ "No saved card on file" ] } if target_id.blank?

      record = client.client_payment_methods.find_by(stripe_payment_method_id: target_id)

      Client.transaction do
        record&.destroy!

        # Choose a new default if the removed one was default (or if client points to it)
        next_default = client.client_payment_methods.where.not(stripe_payment_method_id: target_id).order(created_at: :desc).first

        if next_default
          client.client_payment_methods.update_all(default: false)
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

      settings = PaymentSetting.instance_for(user.studio)
      if settings.configured? && client.stripe_customer_id.present?
        Stripe.api_key = settings.stripe_secret_key
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
