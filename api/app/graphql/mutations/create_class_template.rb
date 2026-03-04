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

      unless user&.owner? || user&.moderator?
        attrs.delete(:compensation_type)
        attrs.delete(:instructor_split_percent)
        attrs.delete(:instructor_flat_rate_cents)
      end

      ct = ClassTemplate.new(attrs)
      if ct.save
        { class_template: ct, errors: [] }
      else
        { class_template: nil, errors: ct.errors.full_messages }
      end
    end
  end
end
