# frozen_string_literal: true

class StudioSubscription < ApplicationRecord
  TIERS = %w[basic premium].freeze
  STATUSES = %w[trialing active past_due cancelled suspended].freeze

  TIER_PRICES = {
    "basic" => { label: "Basic", price_cad: 150, description: "Core scheduling, booking, and basic analytics" },
    "premium" => { label: "Premium", price_cad: 300, description: "Everything in Basic, plus full analytics, instructor payouts, Stripe Connect, priority support" }
  }.freeze

  belongs_to :studio

  validates :tier, inclusion: { in: TIERS }
  validates :status, inclusion: { in: STATUSES }
  validates :studio_id, uniqueness: true

  scope :active_or_trialing, -> { where(status: %w[active trialing]) }

  def active?
    %w[active trialing].include?(status)
  end

  def premium?
    tier == "premium"
  end

  def basic?
    tier == "basic"
  end

  def price_cad
    TIER_PRICES.dig(tier, :price_cad) || 150
  end
end
