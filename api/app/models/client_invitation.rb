# frozen_string_literal: true

class ClientInvitation < ApplicationRecord
  belongs_to :studio
  belongs_to :invited_by, class_name: "User"

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :token, presence: true, uniqueness: true
  validates :expires_at, presence: true

  before_validation :set_token_and_expiry, on: :create

  scope :pending,   -> { where(accepted_at: nil).where("expires_at > ?", Time.current) }
  scope :accepted,  -> { where.not(accepted_at: nil) }
  scope :expired,   -> { where(accepted_at: nil).where("expires_at <= ?", Time.current) }

  def pending?
    accepted_at.nil? && expires_at > Time.current
  end

  def accepted?
    accepted_at.present?
  end

  def expired?
    accepted_at.nil? && expires_at <= Time.current
  end

  def accept!
    update!(accepted_at: Time.current)
  end

  def status
    return "accepted" if accepted?
    return "expired"  if expired?

    "pending"
  end

  private

  def set_token_and_expiry
    self.token     ||= SecureRandom.urlsafe_base64(32)
    self.expires_at ||= 7.days.from_now
  end
end
