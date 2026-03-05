# frozen_string_literal: true

class ContactMailer < ApplicationMailer
  # Sends an inbound contact form submission to the studio team.
  # `from` is inherited from ApplicationMailer (env-aware Resend domain).
  def contact_message(name:, email:, message:)
    @name    = name
    @email   = email
    @message = message

    mail(
      to:       ENV.fetch("CONTACT_EMAIL", "hello@joinstudioflow.com"),
      reply_to: "#{name} <#{email}>",
      subject:  "New contact message from #{name}"
    )
  end
end
