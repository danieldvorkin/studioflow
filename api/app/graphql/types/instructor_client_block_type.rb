module Types
  class InstructorClientBlockType < Types::BaseObject
    field :id, ID, null: false
    field :instructor, Types::UserType, null: false
    field :client, Types::ClientType, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
