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
