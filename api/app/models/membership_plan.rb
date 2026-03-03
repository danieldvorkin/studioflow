class MembershipPlan < ApplicationRecord
  STATUSES = %w[active inactive].freeze
  CURRENCIES = %w[cad usd].freeze

  belongs_to :studio
  has_many :client_memberships, dependent: :restrict_with_error

  validates :name, presence: true
  validates :currency, inclusion: { in: CURRENCIES }
  validates :price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :min_commitment_months, numericality: { only_integer: true, greater_than: 0 }
  validates :private_session_discount_percent, numericality: {
    only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: 100
  }

  scope :published,  -> { where(active: true) }
  scope :ordered,    -> { order(:position, :name) }

  def price_dollars
    price_cents / 100.0
  end

  # Friendly label for classes count
  def reformer_label
    reformer_classes_per_month.nil? ? "Unlimited" : reformer_classes_per_month.to_s
  end

  def mat_label
    mat_classes_per_month.nil? ? "Unlimited" : mat_classes_per_month.to_s
  end
end
