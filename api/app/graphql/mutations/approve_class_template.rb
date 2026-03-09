module Mutations
  class ApproveClassTemplate < BaseMutation
    argument :id, ID, required: true
    argument :approved, Boolean, required: true

    field :class_template, Types::ClassTemplateType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, approved:)
      user = context[:current_user]
      ct = ClassTemplate.where(studio_id: user&.studio_id).find(id)
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, ct).approve?

      was_approved = ct.approved?

      if ct.update(approved: approved)
        # Notify instructor of the decision (only when status actually changes)
        if approved && !was_approved
          NotificationJob.perform_later(:class_template_approved, ct.id)
        elsif !approved && was_approved
          NotificationJob.perform_later(:class_template_rejected, ct.id)
        end
        { class_template: ct, errors: [] }
      else
        { class_template: nil, errors: ct.errors.full_messages }
      end
    end
  end
end
