# frozen_string_literal: true

module Mutations
  class ToggleModeratorActive < BaseMutation
    argument :user_id, ID,      required: true
    argument :active,  Boolean, required: true

    field :user,   Types::UserType, null: true
    field :errors, [ String ],      null: false

    def resolve(user_id:, active:)
      current_user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless current_user&.godmode?

      moderator = User.find_by(id: user_id, role: User::ROLES[:moderator])
      return { user: nil, errors: [ "Moderator not found" ] } unless moderator

      if moderator.update(active: active)
        { user: moderator, errors: [] }
      else
        { user: nil, errors: moderator.errors.full_messages }
      end
    end
  end
end
