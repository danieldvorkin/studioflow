# frozen_string_literal: true

module Mutations
  class InviteUser < BaseMutation
    argument :email, String, required: true
    argument :name, String, required: false
    argument :role, Integer, required: true

    field :user, Types::UserType, null: true
    field :errors, [ String ], null: false

    def resolve(email:, role:, name: nil)
      current_user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless current_user && Pundit.policy!(current_user, User).invite?

      normalized_email = email.to_s.strip.downcase
      return { user: nil, errors: [ "Email is required" ] } if normalized_email.blank?

      allowed_roles = [ User::ROLES[:owner], User::ROLES[:staff], User::ROLES[:instructor] ]
      return { user: nil, errors: [ "Invalid role" ] } unless allowed_roles.include?(role)

      user = User.find_or_initialize_by(email: normalized_email)

      if user.persisted? && user.studio_id != current_user.studio_id
        return { user: nil, errors: [ "This email already belongs to another studio" ] }
      end

      if user.new_record?
        user.studio = current_user.studio
        user.active = true if user.respond_to?(:active) && user.active.nil?
        user.available_for_sessions = true if user.respond_to?(:available_for_sessions) && user.available_for_sessions.nil?

        random_password = Devise.friendly_token.first(20)
        user.password = random_password
        user.password_confirmation = random_password
      end

      user.name = name if name.present?
      user.role = role

      if user.save
        raw_token, hashed_token = Devise.token_generator.generate(User, :reset_password_token)
        user.update!(reset_password_token: hashed_token, reset_password_sent_at: Time.current)

        web_url   = ENV.fetch("WEB_APP_URL", "http://localhost:5173")
        reset_url = "#{web_url}/reset-password?token=#{raw_token}"

        UserMailer.with(
          user:       user,
          studio:     user.studio,
          invited_by: current_user,
          reset_url:  reset_url
        ).invite.deliver_later

        { user: user, errors: [] }
      else
        { user: nil, errors: user.errors.full_messages }
      end
    end
  end
end
