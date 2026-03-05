# frozen_string_literal: true

module Mutations
  class ResetPassword < BaseMutation
    argument :token,    String, required: true
    argument :password, String, required: true

    field :success, Boolean, null: false
    field :token,   String,  null: true
    field :user,    Types::UserType, null: true
    field :errors,  [ String ], null: false

    def resolve(token:, password:)
      user = User.reset_password_by_token(
        reset_password_token:  token,
        password:              password,
        password_confirmation: password
      )

      if user.errors.empty?
        jwt = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
        { success: true, token: jwt, user: user, errors: [] }
      else
        { success: false, token: nil, user: nil, errors: user.errors.full_messages }
      end
    end
  end
end
