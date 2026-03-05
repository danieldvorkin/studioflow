# frozen_string_literal: true

module Mutations
  class DismissNotification < BaseMutation
    argument :id, ID, required: true

    field :notification, Types::NotificationType, null: true
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      return { notification: nil, errors: [ "Not authenticated" ] } unless user

      notification = Notification.find_by(id: id, user_id: user.id)
      return { notification: nil, errors: [ "Notification not found" ] } unless notification

      notification.mark_read!
      notification.dismiss!
      { notification: notification, errors: [] }
    end
  end
end
