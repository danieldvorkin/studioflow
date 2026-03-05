# frozen_string_literal: true

namespace :pricing do
  desc "Seed / refresh platform pricing plan definitions — safe to run in any environment"
  task seed: :environment do
    plans = StudioSubscription::TIER_PRICES

    puts "StudioFlow Pricing Plans"
    puts "─" * 50

    plans.each do |tier, info|
      next if %w[basic premium].include?(tier) # skip legacy aliases in output

      puts format(
        "  %-10s  $%3d/mo  $%3d/yr  — %s",
        info[:label],
        info[:price_usd_monthly],
        info[:price_usd_yearly],
        info[:description]
      )
    end

    puts ""
    puts "Active subscriptions by tier:"
    StudioSubscription::TIERS.each do |tier|
      count = StudioSubscription.where(tier: tier).count
      puts "  #{tier.ljust(10)} #{count} subscription(s)" if count > 0
    end

    puts ""
    puts "Done. No database changes made — pricing is defined in StudioSubscription::TIER_PRICES."
    puts ""
    puts "To migrate existing 'basic' → 'pro' and 'premium' → 'studio':"
    puts "  StudioSubscription.where(tier: 'basic').update_all(tier: 'pro')"
    puts "  StudioSubscription.where(tier: 'premium').update_all(tier: 'studio')"
    puts "Run those via: heroku run rails console --app studio-flow-api"
  end

  desc "Migrate legacy tier names (basic→pro, premium→studio) on existing subscriptions"
  task migrate_tiers: :environment do
    basic_count   = StudioSubscription.where(tier: "basic").count
    premium_count = StudioSubscription.where(tier: "premium").count

    if basic_count.zero? && premium_count.zero?
      puts "No legacy tier records found — nothing to migrate."
      next
    end

    puts "Migrating #{basic_count} basic → pro, #{premium_count} premium → studio..."
    StudioSubscription.where(tier: "basic").update_all(tier: "pro")
    StudioSubscription.where(tier: "premium").update_all(tier: "studio")
    puts "Done."
  end
end
