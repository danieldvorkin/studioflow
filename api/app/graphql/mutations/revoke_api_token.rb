# frozen_string_literal: true

module Mutations
  class RevokeApiToken < BaseMutation
    argument :id, ID, required: true

    field :api_token,  Types::ApiTokenType, null: true
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user
      raise GraphQL::ExecutionError, "Owner access required" unless user.owner? || user.godmode?

      token = user.studio.api_tokens.find_by(id: id, user_id: user.id)
      return { api_token: nil, errors: [ "Token not found" ] } unless token
      return { api_token: token, errors: [ "Token already revoked" ] } if token.revoked?

      token.revoke!
      { api_token: token, errors: [] }
    end
  end
end
