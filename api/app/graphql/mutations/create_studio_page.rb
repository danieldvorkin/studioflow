# frozen_string_literal: true

module Mutations
  class CreateStudioPage < BaseMutation
    argument :title,     String,  required: true
    argument :content,   String,  required: false
    argument :published, Boolean, required: false
    argument :position,  Integer, required: false

    field :studio_page, Types::StudioPageType, null: true
    field :errors, [ String ], null: false

    def resolve(title:, content: nil, published: false, position: 0)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authenticated" unless user
      raise GraphQL::ExecutionError, "Owner access required" unless user.owner? || user.godmode?

      page = StudioPage.new(
        studio:    user.studio,
        title:     title,
        content:   content,
        published: published,
        position:  position
      )

      if page.save
        { studio_page: page, errors: [] }
      else
        { studio_page: nil, errors: page.errors.full_messages }
      end
    end
  end
end
