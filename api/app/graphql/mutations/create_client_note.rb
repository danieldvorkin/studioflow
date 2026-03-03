module Mutations
  class CreateClientNote < BaseMutation
    argument :client_id, ID, required: true
    argument :body, String, required: true

    field :note, Types::ClientNoteType, null: true
    field :errors, [ String ], null: false

    def resolve(client_id:, body:)
      user = context[:current_user]
      return { note: nil, errors: [ 'Not authenticated' ] } unless user

      unless user.godmode? || user.owner? || user.staff? || user.instructor?
        raise GraphQL::ExecutionError, 'Not authorized'
      end

      client = Client.where(studio_id: user.studio_id).find(client_id)

      if user.instructor? && !user.godmode?
        taught = Booking.joins(:class_session).where(client_id: client.id, class_sessions: { instructor_id: user.id }, archived: false).exists?
        raise GraphQL::ExecutionError, 'Not authorized' unless taught
      end

      note = client.client_notes.build(author: user, body: body.to_s.strip)
      if note.save
        { note: note, errors: [] }
      else
        { note: nil, errors: note.errors.full_messages }
      end
    end
  end
end
