module Mutations
  class PayInstructorPayout < BaseMutation
    argument :id, ID, required: true

    field :payout, Types::InstructorPayoutType, null: true
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      raise Pundit::NotAuthorizedError unless user&.owner? || user&.moderator?

      payout = InstructorPayout.where(studio_id: user.studio_id).find_by(id: id)
      return { payout: nil, errors: [ "Payout not found" ] } unless payout

      return { payout: payout, errors: [ "Payout is already marked paid" ] } if payout.paid?

      if payout.instructor_earnings_cents.to_i <= 0
        return { payout: payout, errors: [ "Payout amount must be greater than 0" ] }
      end

      instructor = payout.instructor
      if instructor.stripe_connect_account_id.blank?
        return { payout: payout, errors: [ "Instructor has no Stripe Connect account" ] }
      end

      unless instructor.stripe_connect_onboarding_completed?
        return { payout: payout, errors: [ "Instructor Stripe Connect onboarding is not completed" ] }
      end

      settings = PaymentSetting.instance_for(user.studio)
      unless settings.configured?
        return { payout: payout, errors: [ "Stripe is not configured" ] }
      end

      Stripe.api_key = settings.stripe_secret_key

      begin
        transfer = Stripe::Transfer.create(
          {
            amount: payout.instructor_earnings_cents,
            currency: payout.currency,
            destination: instructor.stripe_connect_account_id,
            metadata: {
              instructor_id: instructor.id,
              instructor_payout_id: payout.id,
              week_start: payout.week_start.to_s,
              week_end: payout.week_end.to_s
            }
          }
        )
      rescue Stripe::StripeError => e
        payout.update(status: "failed")
        stripe_error = begin
          e.respond_to?(:error) ? e.error : nil
        rescue StandardError
          nil
        end

        stripe_code = stripe_error&.code
        request_id = e.respond_to?(:request_id) ? e.request_id : nil

        message = e.message.to_s
        if stripe_code == "balance_insufficient" || message.match?(/insufficient.*(funds|balance)/i)
          message = "Stripe balance is insufficient for this transfer. In Stripe test mode, add funds to your available balance by creating Charges using the 4000000000000077 test card: https://stripe.com/docs/testing#available-balance. Alternatively, use 'Mark paid' to record an off-Stripe payout."
        end

        debug_bits = []
        debug_bits << "code=#{stripe_code}" if stripe_code.present?
        debug_bits << "request_id=#{request_id}" if request_id.present?
        message = "#{message} (Stripe #{debug_bits.join(', ')})" if debug_bits.any?

        return { payout: payout, errors: [ message ] }
      end

      payout.update(
        status: "paid",
        paid_at: Time.zone.now,
        stripe_transfer_id: transfer.id,
        stripe_transfer_raw_response: transfer.to_hash,
        paid_method: "stripe_transfer",
        paid_reference: transfer.id
      )

      { payout: payout, errors: [] }
    end
  end
end
