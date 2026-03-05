# frozen_string_literal: true

module Mutations
  class MarkAllNotificationsRead < BaseMutation
    field :updated_count, Integer, null: false
    field :errors, [ String ], null: false

    def resolve
      user = context[:current_user]
      return { updated_count: 0, errors: [ "Not authenticated" ] } unless user

      count = Notification.where(user_id: user.id, read_at: nil).update_all(read_at: Time.current)
      { updated_count: count, errors: [] }
    end
  end
end
