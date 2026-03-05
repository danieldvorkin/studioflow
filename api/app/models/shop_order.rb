class ShopOrder < ApplicationRecord
  belongs_to :studio
  belongs_to :shop_item
  belongs_to :client

  STATUSES = %w[pending paid cancelled returned].freeze

  validates :quantity, numericality: { only_integer: true, greater_than: 0 }
  validates :total_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :currency, inclusion: { in: %w[cad usd] }
  validates :status, inclusion: { in: STATUSES }

  before_validation :infer_studio
  before_validation :calculate_total, on: :create

  scope :active, -> { where.not(status: "cancelled") }

  private

  def infer_studio
    self.studio_id ||= shop_item&.studio_id || client&.studio_id
  end

  def calculate_total
    return if total_cents.present? && total_cents > 0
    return unless shop_item && quantity

    self.total_cents = shop_item.price_cents * quantity
    self.currency ||= shop_item.currency
  end
end
