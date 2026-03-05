module Mutations
  class CreateInstructorConnectOnboarding < BaseMutation
    argument :instructor_id, ID, required: true

    field :instructor, Types::UserType, null: true
    field :onboarding_url, String, null: true
    field :errors, [ String ], null: false

    def resolve(instructor_id:)
      user = context[:current_user]
      raise Pundit::NotAuthorizedError unless user&.godmode? || user&.owner?

      instructor = User.where(studio_id: user.studio_id).find_by(id: instructor_id)
      return { instructor: nil, onboarding_url: nil, errors: [ "Instructor not found" ] } unless instructor&.instructor?

      settings = PaymentSetting.instance_for(user.studio)
      unless settings.configured?
        return { instructor: nil, onboarding_url: nil, errors: [ "Stripe is not configured" ] }
      end

      Stripe.api_key = settings.stripe_secret_key

      account_id = instructor.stripe_connect_account_id
      if account_id.blank?
        country = ENV["STRIPE_CONNECT_COUNTRY"].presence || "CA"

        begin
          account = Stripe::Account.create(
            {
              type: "express",
              country: country
            }
          )
        rescue Stripe::StripeError => e
          return { instructor: nil, onboarding_url: nil, errors: [ e.message ] }
        end

        account_id = account.id
        instructor.update!(stripe_connect_account_id: account_id, stripe_connect_onboarding_completed: false)
      end

      refresh_url = ENV["STRIPE_CONNECT_REFRESH_URL"].presence || ENV["WEB_APP_URL"].presence || "http://localhost:5173/owner"
      return_url = ENV["STRIPE_CONNECT_RETURN_URL"].presence || ENV["WEB_APP_URL"].presence || "http://localhost:5173/owner"

      begin
        link = Stripe::AccountLink.create(
          {
            account: account_id,
            refresh_url: refresh_url,
            return_url: return_url,
            type: "account_onboarding"
          }
        )
      rescue Stripe::StripeError => e
        return { instructor: instructor, onboarding_url: nil, errors: [ e.message ] }
      end

      { instructor: instructor, onboarding_url: link.url, errors: [] }
    end
  end
end
