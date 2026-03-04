# frozen_string_literal: true

module Mutations
  class SendTestEmail < BaseMutation
    description "Godmode only — send a test email to verify SMTP configuration"

    argument :to, String, required: false,
             description: "Recipient address. Defaults to the godmode user's email."

    field :success, Boolean, null: false
    field :message, String, null: false
    field :errors, [ String ], null: false

    def resolve(to: nil)
      current_user = context[:current_user]

      unless current_user&.godmode?
        return { success: false, message: "Not authorized", errors: [ "Not authorized" ] }
      end

      recipient = (to.presence || current_user.email).strip

      SystemMailer.test_email(to: recipient, sent_at: Time.current).deliver_now

      {
        success: true,
        message: "Test email sent to #{recipient}",
        errors: []
      }
    rescue => e
      Rails.logger.error("[SendTestEmail] #{e.class}: #{e.message}")
      {
        success: false,
        message: e.message,
        errors: [ e.message ]
      }
    end
  end
end
