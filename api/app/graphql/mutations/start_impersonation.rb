module Mutations
  class StartImpersonation < BaseMutation
    argument :user_id, ID, required: true

    field :token, String, null: true
    field :user, Types::UserType, null: true
    field :errors, [ String ], null: false

    def resolve(user_id:)
      actor = context[:current_user]

      unless actor&.godmode? || actor&.owner? || actor&.moderator?
        return { token: nil, user: nil, errors: [ "Not authorized" ] }
      end

      user =
        if actor.respond_to?(:platform_staff?) && actor.platform_staff?
          ::User.find_by(id: user_id)
        else
          ::User.where(studio_id: actor.studio_id).find_by(id: user_id)
        end
      return { token: nil, user: nil, errors: [ "User not found" ] } unless user

      if user.respond_to?(:godmode?) && user.godmode?
        return { token: nil, user: nil, errors: [ "Not authorized" ] }
      end

      token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first

      { token: token, user: user, errors: [] }
    rescue StandardError => e
      { token: nil, user: nil, errors: [ e.message ] }
    end
  end
end
