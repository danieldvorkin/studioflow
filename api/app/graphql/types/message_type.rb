# frozen_string_literal: true

module Types
  class MessageType < Types::BaseObject
    field :id, ID, null: false
    field :conversation_id, ID, null: false
    field :sender_id, ID, null: false
    field :body, String, null: false
    field :read_at, GraphQL::Types::ISO8601DateTime, null: true
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false

    field :sender, Types::UserType, null: false
  end
end