# frozen_string_literal: true

module Mutations
  class UpdateStudioPage < BaseMutation
    argument :id,        ID,      required: true
    argument :title,     String,  required: false
    argument :content,   String,  required: false
    argument :published, Boolean, required: false
    argument :position,  Integer, required: false
    argument :slug,      String,  required: false

    field :studio_page, Types::StudioPageType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, **attrs)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authenticated" unless user
      raise GraphQL::ExecutionError, "Owner access required" unless user.owner? || user.godmode?

      page = user.studio.studio_pages.find_by(id: id)
      return { studio_page: nil, errors: [ "Page not found" ] } unless page

      if page.update(attrs.compact)
        { studio_page: page, errors: [] }
      else
        { studio_page: nil, errors: page.errors.full_messages }
      end
    end
  end
end
