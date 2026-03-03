# frozen_string_literal: true

module Types
  class ClientInvitationType < Types::BaseObject
    field :id,          ID,     null: false
    field :email,       String, null: false
    field :name,        String, null: true
    field :token,       String, null: false
    field :status,      String, null: false  # "pending" | "accepted" | "expired"
    field :expires_at,  GraphQL::Types::ISO8601DateTime, null: false
    field :accepted_at, GraphQL::Types::ISO8601DateTime, null: true
    field :created_at,  GraphQL::Types::ISO8601DateTime, null: false

    field :invited_by_name, String, null: true

    def invited_by_name
      object.invited_by&.name.presence || object.invited_by&.email
    end
  end
end
