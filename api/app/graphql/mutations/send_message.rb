# frozen_string_literal: true

module Mutations
  class SendMessage < BaseMutation
    argument :conversation_id, ID, required: true
    argument :body, String, required: true

    field :message, Types::MessageType, null: true
    field :errors, [String], null: false

    def resolve(conversation_id:, body:)
      user = context[:current_user]
      return { message: nil, errors: ["Not authenticated"] } unless user

      conversation = Conversation.find_by(id: conversation_id)
      return { message: nil, errors: ["Conversation not found"] } unless conversation

      # Must be a participant
      unless conversation.conversation_participants.exists?(user_id: user.id)
        raise GraphQL::ExecutionError, "Not authorized"
      end

      message = conversation.messages.build(sender: user, body: body.strip)
      if message.save
        # Create notification for recipient
        recipient = conversation.other_participant(user)
        if recipient
          Notification.create(
            user: recipient,
            studio: conversation.studio,
            kind: "new_message",
            title: "New message from #{user.name || user.email}",
            body: body.truncate(100),
            action_url: "/messages/#{conversation.id}"
          )

          # Send email notification
          MessageMailer.with(message: message, recipient: recipient).new_message.deliver_later
        end

        { message: message, errors: [] }
      else
        { message: nil, errors: message.errors.full_messages }
      end
    end
  end
end