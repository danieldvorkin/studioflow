module Mutations
  class DeleteStudioLocation < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner? || user&.moderator?

      location = StudioLocation.where(studio_id: user.studio_id).find_by(id: id)
      return { success: false, errors: [ "Studio location not found" ] } unless location

      if location.class_templates.exists?
        return { success: false, errors: [ "Cannot delete a location that still has classes" ] }
      end

      location.destroy!
      { success: true, errors: [] }
    rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotDestroyed => e
      { success: false, errors: [ e.message ] }
    end
  end
end
