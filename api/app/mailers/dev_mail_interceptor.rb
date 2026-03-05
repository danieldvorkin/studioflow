# frozen_string_literal: true

# In development, redirect all outbound email *recipients* to a Resend test-inbox
# address derived from the recipient's name, so we never accidentally spam real
# inboxes while still exercising the full SMTP pipeline.
# Mail is always sent FROM noreply@joinstudioflow.com (a verified Resend domain).
#
# Recipient format: <name-slug>@phooyon.resend.app
# e.g. "Jane Smith" → "jane.smith@phooyon.resend.app"
class DevMailInterceptor
  RESEND_DEV_DOMAIN = "phooyon.resend.app"

  def self.delivering_email(message)
    return unless Rails.env.development?

    message.to  = transform(message.to)
    message.cc  = transform(message.cc)  if message.cc.present?
    message.bcc = transform(message.bcc) if message.bcc.present?
  end

  # --- private helpers -------------------------------------------------------

  def self.transform(addresses)
    Array(addresses).map { |email| dev_address_for(email) }
  end
  private_class_method :transform

  def self.dev_address_for(email)
    slug = slugify(name_for(email))
    "#{slug}@#{RESEND_DEV_DOMAIN}"
  end
  private_class_method :dev_address_for

  # Look up the human name for an e-mail address via User or Client records.
  # Falls back to the local part of the address when no record is found.
  def self.name_for(email)
    record = User.find_by(email: email) || Client.find_by(email: email)
    record&.name.presence || email.split("@").first
  end
  private_class_method :name_for

  # "Jane Smith" → "jane.smith", strips anything that isn't a letter or digit.
  def self.slugify(name)
    name.downcase.gsub(/[^a-z0-9]+/, ".").gsub(/\A\.+|\.+\z/, "")
  end
  private_class_method :slugify
end
