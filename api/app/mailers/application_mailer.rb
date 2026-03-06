class ApplicationMailer < ActionMailer::Base
  default from: -> { ApplicationMailer.default_from_address }
  layout "mailer"

  def self.default_from_address
    "noreply@joinstudioflow.com"
  end

  # Returns the web app base URL, environment-aware.
  # Production uses APP_HOST (e.g. joinstudioflow.com); dev uses WEB_APP_URL.
  def web_app_base_url
    if Rails.env.production?
      host = ENV.fetch("APP_HOST", "joinstudioflow.com")
      "https://#{host}"
    else
      ENV.fetch("WEB_APP_URL", "http://localhost:5173")
    end
  end
end
