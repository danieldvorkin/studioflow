# frozen_string_literal: true

module Mutations
  class MarkConversationRead < BaseMutation
    argument :conversation_id, ID, required: true

    field :conversation, Types::ConversationType, null: true
    field :errors, [String], null: false

    def resolve(conversation_id:)
      user = context[:current_user]
      return { conversation: nil, errors: ["Not authenticated"] } unless user

      conversation = Conversation.find_by(id: conversation_id)
      return { conversation: nil, errors: ["Conversation not found"] } unless conversation

      unless conversation.conversation_participants.exists?(user_id: user.id)
        raise GraphQL::ExecutionError, "Not authorized"
      end

      conversation.mark_read_for!(user)

      { conversation: conversation, errors: [] }
    end
  end
end