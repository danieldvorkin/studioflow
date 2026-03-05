# frozen_string_literal: true

class NotificationJob < ApplicationJob
  queue_as :default

  # ── Dispatch ──────────────────────────────────────────────────────────────

  def perform(kind, resource_id)
    case kind.to_sym
    # ── Booking notifications ──────────────────────────────────────────────
    when :booking_confirmation
      booking = Booking.find(resource_id)
      BookingMailer.with(booking: booking).confirmation.deliver_now
      instructor = booking.class_session.instructor
      BookingMailer.with(booking: booking).instructor_confirmation.deliver_now if instructor&.email.present?

    when :waitlist_promotion
      booking = Booking.find(resource_id)
      BookingMailer.with(booking: booking).waitlist_promotion.deliver_now

    when :booking_cancellation
      booking = Booking.find(resource_id)
      BookingMailer.with(booking: booking).cancellation.deliver_now

    # ── Subscription notifications (resource_id = studio_subscription.id) ──
    when :subscription_trial_ending
      dispatch_subscription_notification(resource_id, kind: :subscription_trial_ending) do |user, sub|
        SubscriptionMailer.trial_ending(user: user, subscription: sub).deliver_now
      end

    when :subscription_trial_expired
      dispatch_subscription_notification(resource_id, kind: :subscription_trial_expired) do |user, sub|
        SubscriptionMailer.trial_expired(user: user, subscription: sub).deliver_now
      end

    when :subscription_payment_failed
      dispatch_subscription_notification(resource_id, kind: :subscription_payment_failed) do |user, sub|
        SubscriptionMailer.payment_failed(user: user, subscription: sub).deliver_now
      end

    when :subscription_cancelled
      dispatch_subscription_notification(resource_id, kind: :subscription_cancelled) do |user, sub|
        SubscriptionMailer.subscription_cancelled(user: user, subscription: sub).deliver_now
      end

    when :subscription_renewed
      dispatch_subscription_notification(resource_id, kind: :subscription_payment_succeeded) do |user, sub|
        SubscriptionMailer.subscription_renewed(user: user, subscription: sub).deliver_now
      end

    else
      Rails.logger.warn("NotificationJob: unknown kind '#{kind}'")
    end
  end

  private

  # Finds the subscription + owner users, creates in-app notifications, and
  # yields each (user, subscription) pair so the caller can send an email.
  def dispatch_subscription_notification(subscription_id, kind:)
    sub = StudioSubscription.find_by(id: subscription_id)
    return unless sub

    studio = sub.studio
    tier_label = StudioSubscription::TIER_PRICES.dig(sub.tier, :label) || sub.tier.capitalize

    title, body, action_url = notification_copy(kind, tier_label, sub)

    # Create in-app notification for each owner
    Notification.notify_owners(
      studio: studio,
      kind:   kind.to_s,
      title:  title,
      body:   body,
      action_url: action_url
    )

    # Send email to each owner
    owner_users = studio.users.where(role: User::ROLES[:owner])
    owner_users.each do |user|
      yield(user, sub)
    rescue StandardError => e
      Rails.logger.error("NotificationJob email failed for user #{user.id}: #{e.message}")
    end
  end

  NOTIFICATION_COPY = {
    subscription_trial_ending: [
      "Your trial is ending soon",
      "Add a payment method to avoid losing access to premium features.",
      "/owner/subscription"
    ],
    subscription_trial_expired: [
      "Your trial has ended",
      "Your account has been moved to the Starter plan. Upgrade to restore access.",
      "/owner/subscription"
    ],
    subscription_payment_failed: [
      "Payment failed",
      "We couldn't process your payment. Please update your payment method.",
      "/owner/subscription"
    ],
    subscription_cancelled: [
      "Subscription cancelled",
      "Your subscription has been cancelled. You're now on the Starter plan.",
      "/owner/subscription"
    ],
    subscription_payment_succeeded: [
      "Subscription renewed",
      "Your subscription has been renewed successfully.",
      "/owner/subscription"
    ]
  }.freeze

  def notification_copy(kind, tier_label, _sub)
    base = NOTIFICATION_COPY.fetch(kind.to_sym, [ "StudioFlow notification", nil, nil ])
    [ "#{base[0]} — #{tier_label}", base[1], base[2] ]
  end
end
