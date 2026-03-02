class Studio < ApplicationRecord
  has_many :users, dependent: :restrict_with_exception
  has_many :studio_locations, dependent: :destroy
  has_many :class_templates, dependent: :destroy
  has_many :class_sessions, dependent: :destroy
  has_many :clients, dependent: :destroy
  has_many :bookings, dependent: :destroy
  has_many :payments, dependent: :destroy
  has_many :instructor_payouts, dependent: :destroy

  validates :name, presence: true

  validates :invite_code, presence: true, uniqueness: true

  before_validation :ensure_invite_code

  private

  def ensure_invite_code
    return if invite_code.present?

    self.invite_code = "S#{SecureRandom.hex(6)}"
  end
end
