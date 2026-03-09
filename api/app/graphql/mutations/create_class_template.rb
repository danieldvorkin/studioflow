module Mutations
  class CreateClassTemplate < BaseMutation
    argument :title, String, required: true
    argument :description, String, required: false
    argument :capacity, Integer, required: false
    argument :duration_minutes, Integer, required: false
    argument :studio_location_id, ID, required: false
    argument :instructor_id, ID, required: false
    argument :price_cents, Integer, required: false
    argument :currency, String, required: false

    argument :compensation_type, String, required: false
    argument :instructor_split_percent, Integer, required: false
    argument :instructor_flat_rate_cents, Integer, required: false

    field :class_template, Types::ClassTemplateType, null: true
    field :errors, [ String ], null: false

    def resolve(**attrs)
      user = context[:current_user]
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, ClassTemplate).create?

      attrs[:studio_id] = user.studio_id

      if user.instructor?
        # Instructors are always assigned to their own templates; pending approval
        attrs[:instructor_id] = user.id
        attrs[:approved] = false
      else
        # Owner/staff/moderator/godmode: templates are immediately approved
        attrs[:approved] = true
      end

      unless user&.godmode? || user&.owner? || user&.moderator?
        attrs.delete(:compensation_type)
        attrs.delete(:instructor_split_percent)
        attrs.delete(:instructor_flat_rate_cents)
      end

      ct = ClassTemplate.new(attrs)
      if ct.save
        # Notify owners when an instructor submits a class for approval
        NotificationJob.perform_later(:class_template_submitted, ct.id) if user.instructor?
        { class_template: ct, errors: [] }
      else
        { class_template: nil, errors: ct.errors.full_messages }
      end
    end
  end
end
