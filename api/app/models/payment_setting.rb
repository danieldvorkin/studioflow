class PaymentSetting < ApplicationRecord
  belongs_to :studio

  def self.instance
    instance_for(Studio.first || Studio.create!(name: 'Demo Studio', slug: 'demo'))
  end

  def self.instance_for(studio)
    setting = where(studio_id: studio.id).first_or_create!(default_currency: "cad", enabled: false)

    publishable = ENV["STRIPE_PUBLISHABLE_KEY"].presence
    secret = ENV["STRIPE_SECRET_KEY"].presence
    webhook = ENV["STRIPE_WEBHOOK_SECRET"].presence

    changed = false

    if publishable && setting.stripe_publishable_key.blank?
      setting.stripe_publishable_key = publishable
      changed = true
    end

    if secret && setting.stripe_secret_key.blank?
      setting.stripe_secret_key = secret
      changed = true
    end

    if webhook && setting.stripe_webhook_secret.blank?
      setting.stripe_webhook_secret = webhook
      changed = true
    end

    if changed && !setting.enabled?
      setting.enabled = true
    end

    setting.save! if setting.changed?
    setting
  end

  def configured?
    stripe_publishable_key.present? && stripe_secret_key.present? && enabled?
  end
end
