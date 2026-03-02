module Mutations
  class UpdateClassSession < BaseMutation
    argument :id, ID, required: true
    argument :start_time, GraphQL::Types::ISO8601DateTime, required: false
    argument :end_time, GraphQL::Types::ISO8601DateTime, required: false
    argument :capacity, Integer, required: false
    argument :room, String, required: false
    argument :bundle_enabled, Boolean, required: false
    argument :bundle_spots, Integer, required: false

    field :class_session, Types::ClassSessionType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, **attrs)
      user = context[:current_user]
      cs = ClassSession.where(studio_id: user&.studio_id).find(id)
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, cs).update?

      if cs.update(attrs.compact)
        { class_session: cs, errors: [] }
      else
        { class_session: nil, errors: cs.errors.full_messages }
      end
    end
  end
end
