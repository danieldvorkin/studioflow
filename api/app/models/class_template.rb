class ClassTemplate < ApplicationRecord
  belongs_to :studio
  belongs_to :studio_location, optional: true
  belongs_to :instructor, class_name: "User", optional: true
  has_many :class_sessions, dependent: :destroy

  scope :approved, -> { where(approved: true) }
  scope :pending_approval, -> { where(approved: false) }
  scope :for_instructor, ->(user) { where(instructor_id: user.id) }

  before_validation :infer_studio

  validates :title, presence: true
  validates :capacity, numericality: { greater_than: 0 }
  validates :currency, inclusion: { in: %w[cad usd] }, allow_nil: true

  validates :compensation_type, inclusion: { in: %w[revenue_share flat_rate] }, allow_nil: true
  validates :instructor_split_percent,
            numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 100 },
            allow_nil: true
  validates :instructor_flat_rate_cents,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 },
            allow_nil: true

  validate :associations_belong_to_studio

  private

  def infer_studio
    self.studio_id ||= studio_location&.studio_id
  end

  def associations_belong_to_studio
    return if studio_id.blank?

    if studio_location && studio_location.studio_id != studio_id
      errors.add(:studio_location, "must belong to the same studio")
    end

    if instructor && instructor.studio_id != studio_id
      errors.add(:instructor, "must belong to the same studio")
    end
  end
end
