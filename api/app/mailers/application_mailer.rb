class ApplicationMailer < ActionMailer::Base
  default from: -> { ApplicationMailer.default_from_address }
  layout "mailer"

  def self.default_from_address
    return ENV["MAILER_FROM"] if ENV["MAILER_FROM"].present?

    domain = Rails.env.production? ? "joinstudioflow.resend.app" : "phooyon.resend.app"
    "noreply@#{domain}"
  end
end
