module Mutations
  class ToggleFavoriteClassSession < BaseMutation
    argument :class_session_id, ID, required: true

    field :class_session, Types::ClassSessionType, null: true
    field :favorited, Boolean, null: false
    field :errors, [ String ], null: false

    def resolve(class_session_id:)
      user = context[:current_user]
      return { class_session: nil, favorited: false, errors: [ "Not authenticated" ] } unless user

      class_session =
        if user.client?
          ClassSession.where(archived: false).find(class_session_id)
        else
          ClassSession.where(studio_id: user.studio_id, archived: false).find(class_session_id)
        end

      record = FavoriteClassSession.find_by(user_id: user.id, class_session_id: class_session.id)

      if record
        record.destroy!
        { class_session: class_session, favorited: false, errors: [] }
      else
        FavoriteClassSession.create!(user_id: user.id, class_session_id: class_session.id)
        { class_session: class_session, favorited: true, errors: [] }
      end
    rescue ActiveRecord::RecordNotFound
      { class_session: nil, favorited: false, errors: [ "Class session not found" ] }
    rescue ActiveRecord::RecordInvalid => e
      { class_session: class_session, favorited: false, errors: e.record.errors.full_messages }
    end
  end
end
