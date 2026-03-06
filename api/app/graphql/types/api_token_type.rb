# frozen_string_literal: true

module Types
  class ApiTokenType < Types::BaseObject
    field :id,           ID,       null: false
    field :name,         String,   null: false
    field :prefix,       String,   null: false,  method: :token_prefix
    field :active,       Boolean,  null: false,  method: :active?
    field :revoked_at,   GraphQL::Types::ISO8601DateTime, null: true
    field :expires_at,   GraphQL::Types::ISO8601DateTime, null: true
    field :last_used_at, GraphQL::Types::ISO8601DateTime, null: true
    field :created_at,   GraphQL::Types::ISO8601DateTime, null: false
  end
end
