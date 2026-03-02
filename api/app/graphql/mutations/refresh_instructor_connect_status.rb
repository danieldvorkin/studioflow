module Mutations
  class RefreshInstructorConnectStatus < BaseMutation
    argument :instructor_id, ID, required: true

    field :instructor, Types::UserType, null: true
    field :errors, [String], null: false

    def resolve(instructor_id:)
      user = context[:current_user]
      raise Pundit::NotAuthorizedError unless user&.owner?

      instructor = User.where(studio_id: user.studio_id).find_by(id: instructor_id)
      return { instructor: nil, errors: ['Instructor not found'] } unless instructor&.instructor?

      settings = PaymentSetting.instance_for(user.studio)
      unless settings.configured?
        return { instructor: nil, errors: ['Stripe is not configured'] }
      end

      if instructor.stripe_connect_account_id.blank?
        return { instructor: instructor, errors: ['Instructor has no Stripe Connect account'] }
      end

      Stripe.api_key = settings.stripe_secret_key

      begin
        account = Stripe::Account.retrieve(instructor.stripe_connect_account_id)
      rescue Stripe::StripeError => e
        return { instructor: instructor, errors: [e.message] }
      end

      completed = !!account.details_submitted

      instructor.update(
        stripe_connect_onboarding_completed: completed
      )

      { instructor: instructor, errors: [] }
    end
  end
end
