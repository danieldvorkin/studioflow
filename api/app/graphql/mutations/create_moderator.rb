# frozen_string_literal: true

module Mutations
  class CreateModerator < BaseMutation
    argument :email, String, required: true
    argument :name, String, required: false

    field :user, Types::UserType, null: true
    field :plaintext_password, String, null: true
    field :errors, [ String ], null: false

    def resolve(email:, name: nil)
      current_user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless current_user&.godmode?

      normalized_email = email.to_s.strip.downcase
      return { user: nil, plaintext_password: nil, errors: [ "Email is required" ] } if normalized_email.blank?

      if User.exists?(email: normalized_email)
        return { user: nil, plaintext_password: nil, errors: [ "A user with that email already exists" ] }
      end

      plaintext = Devise.friendly_token.first(20)

      user = User.new(
        email: normalized_email,
        name: name.presence || normalized_email.split("@").first.to_s.titleize,
        password: plaintext,
        password_confirmation: plaintext,
        role: User::ROLES[:moderator],
        studio: current_user.studio
      )

      if user.save
        UserMailer.with(user: user, plaintext_password: plaintext).moderator_welcome.deliver_later
        { user: user, plaintext_password: plaintext, errors: [] }
      else
        { user: nil, plaintext_password: nil, errors: user.errors.full_messages }
      end
    end
  end
end
