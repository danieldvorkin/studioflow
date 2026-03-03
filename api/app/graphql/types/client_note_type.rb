module Types
  class ClientNoteType < Types::BaseObject
    field :id, ID, null: false
    field :body, String, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :author, Types::UserType, null: false
  end
end
