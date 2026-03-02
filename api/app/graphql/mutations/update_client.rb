module Mutations
  class UpdateClient < BaseMutation
    argument :id, ID, required: true
    argument :name, String, required: false
    argument :email, String, required: false
    argument :phone, String, required: false

    field :client, Types::ClientType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, **attrs)
      user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user&.owner? || user&.staff? || user&.instructor?

      client = Client.where(studio_id: user.studio_id).find(id)
      if client.update(attrs.compact)
        { client: client, errors: [] }
      else
        { client: nil, errors: client.errors.full_messages }
      end
    end
  end
end
