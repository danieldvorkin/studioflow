# frozen_string_literal: true

module Mutations
  class ResetPassword < BaseMutation
    argument :token,    String, required: true
    argument :password, String, required: true

    field :success, Boolean, null: false
    field :errors,  [ String ], null: false

    def resolve(token:, password:)
      user = User.reset_password_by_token(
        reset_password_token:  token,
        password:              password,
        password_confirmation: password
      )

      if user.errors.empty?
        { success: true, errors: [] }
      else
        { success: false, errors: user.errors.full_messages }
      end
    end
  end
end
