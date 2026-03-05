# frozen_string_literal: true

class StudioSubscription < ApplicationRecord
  # Legacy tiers kept for backward-compat; new marketing tiers: starter / pro / studio
  TIERS = %w[starter pro studio basic premium].freeze
  STATUSES = %w[trialing active past_due cancelled suspended].freeze

  TIER_PRICES = {
    # ── Current public pricing ──────────────────────────────────
    "starter" => {
      label: "Starter",
      price_usd_monthly: 0,
      price_usd_yearly: 0,
      price_cad_monthly: 0,
      price_cad_yearly: 0,
      description: "Free forever. 1 location, up to 50 clients, bookings, Stripe payments."
    },
    "pro" => {
      label: "Pro",
      price_usd_monthly: 59,
      price_usd_yearly: 49,
      price_cad_monthly: 79,
      price_cad_yearly: 65,
      description: "Up to 5 locations, unlimited clients, payouts, analytics, bundles & memberships."
    },
    "studio" => {
      label: "Studio",
      price_usd_monthly: 129,
      price_usd_yearly: 109,
      price_cad_monthly: 175,
      price_cad_yearly: 145,
      description: "Unlimited locations, built-in shop, white-label portal, priority support."
    },
    # ── Legacy tiers (existing production records) ─────────────
    "basic"   => { label: "Basic",   price_usd_monthly: 59,  price_usd_yearly: 49,  price_cad_monthly: 79,  price_cad_yearly: 65,  description: "Legacy — maps to Pro." },
    "premium" => { label: "Premium", price_usd_monthly: 129, price_usd_yearly: 109, price_cad_monthly: 175, price_cad_yearly: 145, description: "Legacy — maps to Studio." }
  }.freeze

  belongs_to :studio

  validates :tier, inclusion: { in: TIERS }
  validates :status, inclusion: { in: STATUSES }
  validates :studio_id, uniqueness: true

  scope :active_or_trialing, -> { where(status: %w[active trialing]) }

  def active?
    %w[active trialing].include?(status)
  end

  def starter?
    tier == "starter"
  end

  def pro?
    %w[pro basic].include?(tier)
  end

  def studio?
    %w[studio premium].include?(tier)
  end

  # Legacy aliases
  def premium?
    %w[studio premium].include?(tier)
  end

  def basic?
    %w[pro basic].include?(tier)
  end

  def price_usd_monthly
    TIER_PRICES.dig(tier, :price_usd_monthly) || 0
  end

  def price_usd_yearly
    TIER_PRICES.dig(tier, :price_usd_yearly) || 0
  end

  def price_cad_monthly
    TIER_PRICES.dig(tier, :price_cad_monthly) || 0
  end

  def price_cad_yearly
    TIER_PRICES.dig(tier, :price_cad_yearly) || 0
  end

  # Kept for old callers
  def price_cad
    price_cad_monthly
  end

  # ── Feature limits ──────────────────────────────────────────────────────────

  # Maximum studio locations allowed for this tier (nil = unlimited)
  def max_locations
    case canonical_tier
    when "starter" then 1
    when "pro"     then 5
    else                nil # studio tier: unlimited
    end
  end

  # Maximum active clients allowed for this tier (nil = unlimited)
  def max_clients
    case canonical_tier
    when "starter" then 50
    else                nil
    end
  end

  # ── Feature flags ───────────────────────────────────────────────────────────

  def can_use_analytics?
    pro_or_above?
  end

  def can_use_bundles_and_memberships?
    pro_or_above?
  end

  def can_use_shop?
    studio_tier?
  end

  def can_use_white_label?
    studio_tier?
  end

  def can_use_advanced_permissions?
    studio_tier?
  end

  def can_use_instructor_payouts?
    pro_or_above?
  end

  # ── Limit checks ────────────────────────────────────────────────────────────

  def within_location_limit?(current_count)
    max_locations.nil? || current_count < max_locations
  end

  def within_client_limit?(current_count)
    max_clients.nil? || current_count < max_clients
  end

  # Friendly label for the plan (resolves legacy names → canonical)
  def tier_label
    TIER_PRICES.dig(canonical_tier, :label) || tier.capitalize
  end

  # ── Trial helpers ────────────────────────────────────────────────────────────

  def trialing?
    status == "trialing"
  end

  def trial_days_remaining
    return nil unless trialing? && current_period_end
    [ (current_period_end - Time.current) / 1.day, 0 ].max.ceil
  end

  def trial_ending_soon?(threshold_days: 3)
    trialing? && trial_days_remaining&.<=(threshold_days)
  end

  private

  # Resolves legacy tier names to canonical ones
  def canonical_tier
    case tier
    when "basic"   then "pro"
    when "premium" then "studio"
    else                tier
    end
  end

  def pro_or_above?
    %w[pro basic studio premium].include?(tier)
  end

  def studio_tier?
    %w[studio premium].include?(tier)
  end
end
