module Mutations
  class UpdateClassTemplate < BaseMutation
    argument :id, ID, required: true
    argument :title, String, required: false
    argument :description, String, required: false
    argument :capacity, Integer, required: false
    argument :duration_minutes, Integer, required: false
    argument :price_cents, Integer, required: false
    argument :studio_location_id, ID, required: false
    argument :instructor_id, ID, required: false
    argument :currency, String, required: false

    argument :compensation_type, String, required: false
    argument :instructor_split_percent, Integer, required: false
    argument :instructor_flat_rate_cents, Integer, required: false

    field :class_template, Types::ClassTemplateType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, **attrs)
      user = context[:current_user]
      ct = ClassTemplate.where(studio_id: user&.studio_id).find(id)
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, ct).update?

      if user&.instructor?
        attrs.delete(:instructor_id)
        attrs[:instructor_id] = user.id
      end

      unless user&.owner?
        attrs.delete(:compensation_type)
        attrs.delete(:instructor_split_percent)
        attrs.delete(:instructor_flat_rate_cents)
      end

      if ct.update(attrs.compact)
        { class_template: ct, errors: [] }
      else
        { class_template: nil, errors: ct.errors.full_messages }
      end
    end
  end
end
