class BundlePurchase < ApplicationRecord
  belongs_to :studio
  belongs_to :client
  belongs_to :bundle_product

  has_many :bookings, dependent: :nullify

  enum :status, {
    succeeded: "succeeded",
    failed: "failed",
    refunded: "refunded"
  }, validate: true

  validates :credits_total, numericality: { only_integer: true, greater_than: 0 }
  validates :credits_remaining, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :unit_price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :remainder_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :currency, inclusion: { in: %w[cad usd] }

  validate :associations_belong_to_studio

  def redeemable_for?(class_session)
    return false unless succeeded?
    return false unless credits_remaining.to_i.positive?
    return false unless class_session
    return false unless class_session.bundle_enabled?

    product = bundle_product
    return false unless product&.active?
    return false if product.currency.to_s != (class_session.class_template&.currency.presence || "cad").to_s

    if product.class_template_id.present? && product.class_template_id != class_session.class_template_id
      return false
    end

    if product.instructor_id.present? && product.instructor_id != class_session.instructor_id
      return false
    end

    true
  end

  # Atomically redeems 1 credit and returns the amount_cents to attribute to the redeemed session.
  def redeem_one_credit!(
    class_session:,
    booking: nil
  )
    raise ArgumentError, "class_session is required" unless class_session

    with_lock do
      unless redeemable_for?(class_session)
        errors.add(:base, "Bundle is not redeemable for this session")
        raise ActiveRecord::RecordInvalid, self
      end

      if credits_remaining.to_i <= 0
        errors.add(:credits_remaining, "no credits remaining")
        raise ActiveRecord::RecordInvalid, self
      end

      # Distribute remainder cents across the first N redemptions.
      amount = unit_price_cents.to_i
      if remainder_cents.to_i.positive?
        amount += 1
        self.remainder_cents = remainder_cents.to_i - 1
      end

      self.credits_remaining = credits_remaining.to_i - 1
      save!

      amount
    end
  end

  private

  def associations_belong_to_studio
    return if studio_id.blank?

    if client && client.studio_id != studio_id
      errors.add(:client, "must belong to the same studio")
    end

    if bundle_product && bundle_product.studio_id != studio_id
      errors.add(:bundle_product, "must belong to the same studio")
    end
  end
end
