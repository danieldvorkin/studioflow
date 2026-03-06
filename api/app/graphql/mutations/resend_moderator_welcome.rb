# frozen_string_literal: true

module Mutations
  class ResendModeratorWelcome < BaseMutation
    argument :user_id, ID, required: true

    field :user,   Types::UserType, null: true
    field :errors, [ String ],      null: false

    def resolve(user_id:)
      current_user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless current_user&.godmode?

      moderator = User.find_by(id: user_id, role: User::ROLES[:moderator])

      unless moderator
        return { user: nil, errors: [ "Moderator not found" ] }
      end

      # Generate a fresh temporary password so the link/credentials are always usable.
      plaintext = Devise.friendly_token.first(20)

      unless moderator.update(password: plaintext, password_confirmation: plaintext)
        return { user: nil, errors: moderator.errors.full_messages }
      end

      UserMailer.with(user: moderator, plaintext_password: plaintext)
                .moderator_welcome
                .deliver_later

      { user: moderator, errors: [] }
    end
  end
end
