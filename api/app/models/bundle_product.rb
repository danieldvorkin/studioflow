class BundleProduct < ApplicationRecord
  belongs_to :studio
  belongs_to :class_template, optional: true
  belongs_to :instructor, class_name: "User", optional: true

  has_many :bundle_purchases, dependent: :restrict_with_error

  validates :title, presence: true
  validates :currency, inclusion: { in: %w[cad usd] }
  validates :credits_count, numericality: { only_integer: true, greater_than: 0 }
  validates :price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  validate :must_target_class_or_instructor
  validate :associations_belong_to_studio

  def unit_price_cents
    return 0 if credits_count.to_i <= 0

    (price_cents.to_i / credits_count.to_i)
  end

  def remainder_cents
    return 0 if credits_count.to_i <= 0

    (price_cents.to_i % credits_count.to_i)
  end

  private

  def must_target_class_or_instructor
    return if class_template_id.present? || instructor_id.present?

    errors.add(:base, "Bundle must be linked to a class or an instructor")
  end

  def associations_belong_to_studio
    return if studio_id.blank?

    if class_template && class_template.studio_id != studio_id
      errors.add(:class_template, "must belong to the same studio")
    end

    if instructor && instructor.studio_id != studio_id
      errors.add(:instructor, "must belong to the same studio")
    end
  end
end
