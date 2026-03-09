# frozen_string_literal: true

module Types
  class ConversationType < Types::BaseObject
    field :id, ID, null: false
    field :studio_id, ID, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false

    field :other_participant, Types::UserType, null: true
    field :last_message, Types::MessageType, null: true
    field :unread_count, Integer, null: false
    field :messages, [Types::MessageType], null: false

    def other_participant
      object.other_participant(context[:current_user])
    end

    def last_message
      object.last_message
    end

    def unread_count
      object.unread_count_for(context[:current_user])
    end

    def messages
      object.messages.chronological
    end
  end
end