# frozen_string_literal: true

module Mutations
  class CreateApiToken < BaseMutation
    argument :name, String, required: true

    field :api_token,  Types::ApiTokenType, null: true
    field :raw_token,  String, null: true,
      description: "The plaintext token — shown only once. Store it securely."
    field :errors, [ String ], null: false

    def resolve(name:)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user
      raise GraphQL::ExecutionError, "Owner access required" unless user.owner? || user.godmode?

      name = name.to_s.strip
      return { api_token: nil, raw_token: nil, errors: [ "Name is required" ] } if name.blank?

      token_record, raw = ApiToken.generate!(user: user, studio: user.studio, name: name)
      { api_token: token_record, raw_token: raw, errors: [] }
    rescue ActiveRecord::RecordInvalid => e
      { api_token: nil, raw_token: nil, errors: e.record.errors.full_messages }
    end
  end
end
