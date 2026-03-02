class Booking < ApplicationRecord
  belongs_to :studio
  belongs_to :client
  belongs_to :class_session
  has_one :payment, dependent: :nullify

  enum :status, { booked: 0, waitlisted: 1, cancelled: 2, no_show: 3 }

  validates :client_id,
            uniqueness: {
              scope: :class_session_id,
              message: 'already booked for this session',
              conditions: -> { where.not(status: Booking.statuses[:cancelled]) }
            }
  validates :slug, uniqueness: true, allow_nil: true

  before_validation :infer_studio

  before_validation :ensure_slug, on: :create

  private

  def infer_studio
    self.studio_id ||= client&.studio_id || class_session&.studio_id
  end

  def ensure_slug
    return if slug.present?

    require 'securerandom'

    self.slug = loop do
      candidate = SecureRandom.hex(4)
      break candidate unless Booking.exists?(slug: candidate)
    end
  end
end
