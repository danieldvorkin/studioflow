# frozen_string_literal: true

module Mutations
  class ForgotPassword < BaseMutation
    argument :email, String, required: true

    field :success, Boolean, null: false
    field :errors,  [ String ], null: false

    def resolve(email:)
      user = User.find_by(email: email.to_s.strip.downcase)

      if user
        raw_token, hashed_token = Devise.token_generator.generate(User, :reset_password_token)
        user.update!(
          reset_password_token:   hashed_token,
          reset_password_sent_at: Time.current
        )

        web_url   = ENV.fetch("WEB_APP_URL", "http://localhost:5173")
        reset_url = "#{web_url}/reset-password?token=#{raw_token}"

        UserMailer.with(user: user, reset_url: reset_url)
                  .reset_password_instructions
                  .deliver_later
      end

      # Always return success to prevent email-enumeration
      { success: true, errors: [] }
    end
  end
end
