# frozen_string_literal: true

class ContactMailer < ApplicationMailer
  # Sends an inbound contact form submission to the studio team.
  # `from` is inherited from ApplicationMailer (env-aware Resend domain).
  def contact_message(name:, email:, subject: nil, message:)
    @name    = name
    @email   = email
    @subject = subject
    @message = message

    email_subject = subject.present? ? "[#{subject}] New message from #{name}" : "New contact message from #{name}"

    mail(
      to:       ENV.fetch("CONTACT_EMAIL", "contact@joinstudioflow.com"),
      reply_to: "#{name} <#{email}>",
      subject:  email_subject
    )
  end
end
