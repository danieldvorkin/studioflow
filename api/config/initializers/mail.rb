# Resend SMTP relay configuration
# Set RESEND_API_KEY in your environment (or .env / Rails credentials).
# Replace the placeholder key with your actual key from https://resend.com/api-keys
#
# Environment variable: RESEND_API_KEY=re_xxxxxxxxx
#
if ENV["RESEND_API_KEY"].present? && !Rails.env.test?
  ActionMailer::Base.delivery_method = :smtp
  ActionMailer::Base.smtp_settings = {
    address: "smtp.resend.com",
    port: 587,
    user_name: "resend",
    password: ENV["RESEND_API_KEY"],
    authentication: :plain,
    enable_starttls_auto: true
  }
end

# In development, intercept all outgoing mail and redirect recipients to
# <name-slug>@phooyon.resend.app so we never hit real inboxes.
# Defer until after Rails autoloads app/ so DevMailInterceptor is defined.
Rails.application.config.to_prepare do
  ActionMailer::Base.register_interceptor(DevMailInterceptor) if Rails.env.development?
end
