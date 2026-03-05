class ApplicationMailer < ActionMailer::Base
  default from: -> { ApplicationMailer.default_from_address }
  layout "mailer"

  def self.default_from_address
    "noreply@joinstudioflow.com"
  end
end
