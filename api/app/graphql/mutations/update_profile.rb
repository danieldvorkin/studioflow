# frozen_string_literal: true

module Mutations
  class UpdateProfile < BaseMutation
    argument :name, String, required: false
    argument :email, String, required: false
    argument :avatar_url, String, required: false
    argument :password, String, required: false
    argument :password_confirmation, String, required: false
    argument :current_password, String, required: false

    field :user, Types::UserType, null: true
    field :errors, [ String ], null: false

    def resolve(**attrs)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      current_password = attrs.delete(:current_password)

      changing_email = attrs.key?(:email) && attrs[:email].present? && attrs[:email] != user.email
      changing_password = attrs.key?(:password) && attrs[:password].present?
      requires_password = changing_email || changing_password

      if requires_password
        if current_password.blank?
          return { user: nil, errors: [ "Current password is required" ] }
        end

        unless user.valid_password?(current_password)
          return { user: nil, errors: [ "Current password is incorrect" ] }
        end
      end

      update_attrs = attrs.compact
      return { user:, errors: [] } if update_attrs.empty?

      if user.update(update_attrs)
        { user:, errors: [] }
      else
        { user: nil, errors: user.errors.full_messages }
      end
    end
  end
end
