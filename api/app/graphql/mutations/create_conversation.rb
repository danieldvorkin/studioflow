# frozen_string_literal: true

module Mutations
  class CreateConversation < BaseMutation
    argument :recipient_id, ID, required: true

    field :conversation, Types::ConversationType, null: true
    field :errors, [String], null: false

    def resolve(recipient_id:)
      user = context[:current_user]
      return { conversation: nil, errors: ["Not authenticated"] } unless user

      recipient = User.find_by(id: recipient_id)
      return { conversation: nil, errors: ["Recipient not found"] } unless recipient

      # Must be in the same studio
      unless user.studio_id == recipient.studio_id || user.platform_staff?
        raise GraphQL::ExecutionError, "Not authorized"
      end

      # Check messaging permissions
      error = check_messaging_permission(user, recipient)
      return { conversation: nil, errors: [error] } if error

      studio = user.platform_staff? ? recipient.studio : user.studio

      # Find or create conversation
      conversation = Conversation.between(user, recipient, studio: studio)
      unless conversation
        conversation = Conversation.create!(studio: studio)
        conversation.conversation_participants.create!(user: user)
        conversation.conversation_participants.create!(user: recipient)
      end

      { conversation: conversation, errors: [] }
    end

    private

    def check_messaging_permission(sender, recipient)
      return nil if sender.platform_staff?
      return nil if sender.owner?

      case sender.role_name
      when "staff"
        # Staff can message clients, instructors, and owners
        nil
      when "instructor"
        # Instructors can message clients and owners
        if recipient.instructor? || recipient.staff?
          "Instructors can only message clients and owners"
        end
      when "client"
        # Clients can message instructors only if not blocked
        unless recipient.owner? || recipient.instructor?
          return "Clients can only message instructors and owners"
        end

        if recipient.instructor?
          client = Client.find_by(user_id: sender.id, studio_id: sender.studio_id)
          if client && InstructorClientBlock.exists?(instructor_id: recipient.id, client_id: client.id)
            return "You cannot message this instructor until they have approved you"
          end
        end

        nil
      else
        "Not authorized to send messages"
      end
    end
  end
end