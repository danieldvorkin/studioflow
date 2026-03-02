module Mutations
  class StartImpersonation < BaseMutation
    argument :user_id, ID, required: true

    field :token, String, null: true
    field :user, Types::UserType, null: true
    field :errors, [String], null: false

    def resolve(user_id:)
      owner = context[:current_user]

      unless owner&.owner?
        return { token: nil, user: nil, errors: ["Not authorized"] }
      end

      user = ::User.where(studio_id: owner.studio_id).find_by(id: user_id)
      return { token: nil, user: nil, errors: ["User not found"] } unless user

      token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first

      { token: token, user: user, errors: [] }
    rescue StandardError => e
      { token: nil, user: nil, errors: [e.message] }
    end
  end
end
