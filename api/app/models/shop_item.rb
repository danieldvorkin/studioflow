class ShopItem < ApplicationRecord
  belongs_to :studio
  belongs_to :studio_location, optional: true

  has_many :shop_orders, dependent: :restrict_with_error

  ITEM_TYPES = %w[sale rental].freeze

  validates :title, presence: true
  validates :price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :currency, inclusion: { in: %w[cad usd] }
  validates :item_type, inclusion: { in: ITEM_TYPES }
  validates :stock_quantity,
            numericality: { only_integer: true, greater_than_or_equal_to: 0 },
            allow_nil: true

  scope :active, -> { where(active: true) }

  def in_stock?
    stock_quantity.nil? || stock_quantity > 0
  end

  def rental?
    item_type == "rental"
  end

  def sale?
    item_type == "sale"
  end
end
