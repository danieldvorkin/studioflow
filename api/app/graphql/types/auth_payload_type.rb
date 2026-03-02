module Types
  class AuthPayloadType < Types::BaseObject
    field :token, String, null: true
    field :user, Types::UserType, null: true
  end
end
