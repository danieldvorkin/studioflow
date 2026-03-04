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
        user.send_reset_password_instructions
        { user: user, errors: [] }
      else
        { user: nil, errors: user.errors.full_messages }
      end
    end
  end
end
