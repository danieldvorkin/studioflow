class InstructorPayout < ApplicationRecord
  belongs_to :studio
  belongs_to :instructor, class_name: "User"
  belongs_to :created_by, class_name: "User"

  enum :status, {
    draft: "draft",
    paid: "paid",
    failed: "failed"
  }, validate: true

  validates :week_start, presence: true
  validates :week_end, presence: true
  validates :currency, presence: true

  validates :gross_cents, numericality: { greater_than_or_equal_to: 0 }
  validates :instructor_earnings_cents, numericality: true
  validates :studio_cut_cents, numericality: true

  validates :week_start, uniqueness: { scope: %i[instructor_id currency], message: "payout already exists for this week and currency" }

  validate :associations_belong_to_studio

  private

  def associations_belong_to_studio
    return if studio_id.blank?

    if instructor && instructor.studio_id != studio_id
      errors.add(:instructor, "must belong to the same studio")
    end
    if created_by && created_by.studio_id != studio_id
      errors.add(:created_by, "must belong to the same studio")
    end
  end
end
