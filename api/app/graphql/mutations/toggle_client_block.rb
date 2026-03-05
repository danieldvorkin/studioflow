module Mutations
  class ToggleClientBlock < BaseMutation
    argument :client_id, ID, required: true
    argument :blocked, Boolean, required: true

    field :client, Types::ClientType, null: true
    field :blocked, Boolean, null: false
    field :errors, [ String ], null: false

    def resolve(client_id:, blocked:)
      user = context[:current_user]
      unless user&.godmode? || user&.instructor? || user&.owner? || user&.staff? || user&.moderator?
        raise GraphQL::ExecutionError, "Not authorized"
      end

      client = Client.where(studio_id: user.studio_id).find(client_id)

      instructor_id = if user.instructor?
                         user.id
      else
                         user.id
      end

      if blocked
        InstructorClientBlock.find_or_create_by!(studio_id: user.studio_id, instructor_id:, client_id: client.id)
      else
        InstructorClientBlock.where(instructor_id:, client_id: client.id).destroy_all
      end

      { client:, blocked:, errors: [] }
    rescue ActiveRecord::RecordNotFound
      { client: nil, blocked:, errors: [ "Client not found" ] }
    rescue StandardError => e
      { client: nil, blocked:, errors: [ e.message ] }
    end
  end
end
