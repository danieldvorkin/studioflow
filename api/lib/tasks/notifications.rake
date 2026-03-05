# frozen_string_literal: true

# Run via: rails notifications:subscription_reminders
# Schedule with Heroku Scheduler or a cron job — recommended: once daily
#
# Checks for:
#   1. Trials ending in ≤ 3 days  → trial_ending email + in-app notification
#   2. Trials that expired         → downgrade to starter, trial_expired notification
#   3. Past-due subscriptions      → reminder notification (no email repeat — Stripe handles retries)

namespace :notifications do
  desc "Check subscriptions and send reminders / downgrade expired trials"
  task subscription_reminders: :environment do
    platform_key = ENV["PLATFORM_STRIPE_SECRET_KEY"].presence
    now = Time.current

    # ── 1. Trials ending in ≤ 3 days ─────────────────────────────────────────
    ending_soon = StudioSubscription
      .where(status: "trialing")
      .where("current_period_end > ? AND current_period_end <= ?", now, 3.days.from_now)

    ending_soon.each do |sub|
      NotificationJob.perform_later(:subscription_trial_ending.to_s, sub.id)
      puts "  [trial_ending] studio_id=#{sub.studio_id} ends #{sub.current_period_end}"
    end

    # ── 2. Trials that have expired ──────────────────────────────────────────
    expired = StudioSubscription
      .where(status: "trialing")
      .where("current_period_end < ?", now)

    expired.each do |sub|
      old_tier = sub.tier

      # Downgrade to Starter
      sub.update!(tier: "starter", status: "active")

      # Downgrade trial in Stripe too if we have a Stripe subscription
      if platform_key.present? && sub.stripe_subscription_id.present?
        begin
          Stripe.api_key = platform_key
          Stripe::Subscription.cancel(sub.stripe_subscription_id)
        rescue Stripe::StripeError => e
          Rails.logger.warn("Stripe cancel failed for sub #{sub.id}: #{e.message}")
        end
      end

      NotificationJob.perform_later(:subscription_trial_expired.to_s, sub.id)
      puts "  [trial_expired] studio_id=#{sub.studio_id} (was #{old_tier}) → downgraded to starter"
    end

    # ── 3. Past-due subscriptions — send in-app reminder ─────────────────────
    past_due = StudioSubscription.where(status: "past_due")

    past_due.each do |sub|
      # Avoid spamming — only create the in-app notification once per 24 h window
      already_notified = Notification
        .where(studio_id: sub.studio_id, kind: "subscription_payment_failed")
        .where("created_at > ?", 24.hours.ago)
        .exists?

      next if already_notified

      studio = sub.studio
      tier_label = StudioSubscription::TIER_PRICES.dig(sub.tier, :label) || sub.tier.capitalize
      Notification.notify_owners(
        studio:     studio,
        kind:       "subscription_payment_failed",
        title:      "Payment failed — #{tier_label}",
        body:       "We couldn't process your payment. Please update your payment method to avoid interruption.",
        action_url: "/owner/subscription"
      )
      puts "  [past_due_reminder] studio_id=#{sub.studio_id}"
    end

    puts ""
    puts "Done. ending_soon=#{ending_soon.count}, expired=#{expired.count}, past_due=#{past_due.count}"
  end

  desc "Notify studio owners about classes starting in the next 24 hours"
  task class_reminders: :environment do
    window_start = Time.current
    window_end   = 24.hours.from_now

    upcoming = ClassSession
      .active
      .where(start_time: window_start..window_end)
      .includes(:studio, :class_template, :bookings, :instructor)

    notified = 0

    upcoming.each do |cs|
      booked_count = cs.bookings.where(status: "booked", archived: false).count
      next if booked_count.zero?

      # Dedup: skip if we already sent this reminder for this session
      already = Notification
        .where(studio_id: cs.studio_id, kind: "class_reminder")
        .where("action_url = ?", "/schedule/#{cs.id}")
        .where("created_at > ?", 24.hours.ago)
        .exists?
      next if already

      time_str = cs.start_time.strftime("%a %-d %b at %-I:%M %p")
      name     = cs.class_template&.title || "Class"
      capacity = cs.capacity || cs.class_template&.capacity

      Notification.notify_owners(
        studio:     cs.studio,
        kind:       "class_reminder",
        title:      "#{name} coming up soon",
        body:       "#{booked_count}#{"/" + capacity.to_s if capacity} client#{"s" if booked_count != 1} booked for #{time_str}.",
        action_url: "/schedule/#{cs.id}"
      )
      notified += 1
      puts "  [class_reminder] session=#{cs.id} '#{name}' #{time_str} | #{booked_count} booked"
    end

    puts ""
    puts "Done. class_reminder notifications created=#{notified}"
  end
end
