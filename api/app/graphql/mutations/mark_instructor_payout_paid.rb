module Mutations
  class MarkInstructorPayoutPaid < BaseMutation
    argument :id, ID, required: true
    argument :paid_method, String, required: true
    argument :paid_reference, String, required: false
    argument :paid_notes, String, required: false

    field :payout, Types::InstructorPayoutType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, paid_method:, paid_reference: nil, paid_notes: nil)
      user = context[:current_user]
      raise Pundit::NotAuthorizedError unless user&.godmode? || user&.owner? || user&.moderator?

      payout = InstructorPayout.where(studio_id: user.studio_id).find_by(id: id)
      return { payout: nil, errors: [ "Payout not found" ] } unless payout

      return { payout: payout, errors: [ "Payout is already marked paid" ] } if payout.paid?

      if payout.instructor_earnings_cents.to_i <= 0
        return { payout: payout, errors: [ "Payout amount must be greater than 0" ] }
      end

      payout.update(
        status: "paid",
        paid_at: Time.zone.now,
        paid_method: paid_method,
        paid_reference: paid_reference,
        paid_notes: paid_notes
      )

      { payout: payout, errors: [] }
    end
  end
end
