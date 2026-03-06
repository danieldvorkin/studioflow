# frozen_string_literal: true

module Mutations
  class DeleteStudioPage < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors,  [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authenticated" unless user
      raise GraphQL::ExecutionError, "Owner access required" unless user.owner? || user.godmode?

      page = user.studio.studio_pages.find_by(id: id)
      return { success: false, errors: [ "Page not found" ] } unless page

      page.destroy
      { success: true, errors: [] }
    end
  end
end
