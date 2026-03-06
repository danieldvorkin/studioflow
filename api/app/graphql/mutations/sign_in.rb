module Mutations
  class SignIn < BaseMutation
    argument :email, String, required: true
    argument :password, String, required: true

    field :token, String, null: true
    field :user, Types::UserType, null: true
    field :errors, [ String ], null: false

    def resolve(email:, password:)
      user = ::User.find_for_authentication(email: email)
      if user&.valid_password?(password)
        return { token: nil, user: nil, errors: [ "Your account has been deactivated. Contact support." ] } unless user.active?

        token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
        { token: token, user: user, errors: [] }
      else
        { token: nil, user: nil, errors: [ "Invalid credentials" ] }
      end
    end
  end
end
