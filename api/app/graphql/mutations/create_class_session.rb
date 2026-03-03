module Mutations
  class CreateClassSession < BaseMutation
    argument :class_template_id, ID, required: true
    argument :start_time, GraphQL::Types::ISO8601DateTime, required: true
    argument :end_time, GraphQL::Types::ISO8601DateTime, required: false
    argument :capacity, Integer, required: false
    argument :room, String, required: false
    argument :bundle_enabled, Boolean, required: false
    argument :bundle_spots, Integer, required: false

    field :class_session, Types::ClassSessionType, null: true
    field :errors, [ String ], null: false

    def resolve(class_template_id:, start_time:, end_time: nil, capacity: nil, room: nil, bundle_enabled: nil, bundle_spots: nil)
      user = context[:current_user]
      ct = ClassTemplate.where(studio_id: user&.studio_id).find(class_template_id)
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, ClassSession).create?

      instructor_id = ct.instructor_id
      if user&.instructor?
        taught_before =
          ClassSession
            .where(studio_id: user.studio_id, instructor_id: user.id, class_template_id: ct.id)
            .exists?

        allowed = (ct.instructor_id == user.id) || taught_before
        raise Pundit::NotAuthorizedError unless allowed

        # Instructors can only create sessions for themselves.
        instructor_id = user.id
      end
      if instructor_id
        instructor = User.find_by(id: instructor_id)
        if instructor.nil? || !instructor.active? || !instructor.available_for_sessions?
          return { class_session: nil, errors: [ "Instructor is not available for sessions" ] }
        end
      end

      cs_attrs = {
        studio_id: user.studio_id,
        start_time: start_time,
        end_time: end_time,
        capacity: capacity,
        room: room,
        instructor_id: instructor_id
      }
      cs_attrs[:bundle_enabled] = bundle_enabled unless bundle_enabled.nil?
      cs_attrs[:bundle_spots] = bundle_spots unless bundle_spots.nil?

      cs = ct.class_sessions.build(cs_attrs)
      if cs.save
        { class_session: cs, errors: [] }
      else
        { class_session: nil, errors: cs.errors.full_messages }
      end
    end
  end
end
