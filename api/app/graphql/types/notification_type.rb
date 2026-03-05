# frozen_string_literal: true

module Types
  class NotificationType < Types::BaseObject
    field :id,          ID,                                    null: false
    field :user_id,     ID,                                    null: false
    field :studio_id,   ID,                                    null: true
    field :kind,        String,                                null: false
    field :title,       String,                                null: false
    field :body,        String,                                null: true
    field :action_url,  String,                                null: true
    field :read_at,     GraphQL::Types::ISO8601DateTime,       null: true
    field :dismissed_at, GraphQL::Types::ISO8601DateTime,      null: true
    field :created_at,  GraphQL::Types::ISO8601DateTime,       null: false
    field :updated_at,  GraphQL::Types::ISO8601DateTime,       null: false

    # Computed convenience booleans
    field :read,      Boolean, null: false
    field :dismissed, Boolean, null: false

    def read
      object.read?
    end

    def dismissed
      object.dismissed?
    end
  end
end
