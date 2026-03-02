module Mutations
  class CreateClient < BaseMutation
    field :client, Types::ClientType, null: true
    field :errors, [String], null: false

    def resolve
      user = context[:current_user]
      return { client: nil, errors: ['Not authenticated'] } unless user

      client = Client.find_or_initialize_by(user_id: user.id, studio_id: user.studio_id)
      client.name ||= user.name
      client.email ||= user.email
      if client.save
        { client: client, errors: [] }
      else
        { client: nil, errors: client.errors.full_messages }
      end
    end
  end
end
