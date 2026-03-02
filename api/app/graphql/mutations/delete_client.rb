module Mutations
  class DeleteClient < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner?

      client = Client.where(studio_id: user.studio_id).find(id)
      client.destroy!
      { success: true, errors: [] }
    rescue StandardError => e
      { success: false, errors: [ e.message ] }
    end
  end
end
