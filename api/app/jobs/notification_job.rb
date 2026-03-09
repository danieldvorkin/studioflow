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

    when :waitlist_confirmation
      booking = Booking.find(resource_id)
      BookingMailer.with(booking: booking).waitlist_confirmation.deliver_now

    when :waitlist_promotion
      booking = Booking.find(resource_id)
      payment = booking.payment
      BookingMailer.with(booking: booking, payment: payment).waitlist_promotion.deliver_now

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

    # ── Class template notifications ───────────────────────────────────────
    when :class_template_submitted
      template = ClassTemplate.find_by(id: resource_id)
      return unless template

      studio = template.studio
      instructor = template.instructor
      owner_users = studio.users.where(role: User::ROLES[:owner])

      owner_users.each do |owner|
        Notification.find_or_create_by!(
          user: owner,
          studio: studio,
          kind: "class_template_submitted",
          title: "New class pending approval: \"#{template.title}\""
        ) do |n|
          n.body       = "#{instructor&.name.presence || instructor&.email || 'An instructor'} submitted a class for your review."
          n.action_url = "/templates"
        end

        ClassTemplateMailer.with(owner: owner, template: template).pending_approval.deliver_later
      rescue StandardError => e
        Rails.logger.error("NotificationJob class_template_submitted email failed for owner #{owner.id}: #{e.message}")
      end

    when :class_template_approved
      template = ClassTemplate.find_by(id: resource_id)
      return unless template

      instructor = template.instructor
      return unless instructor

      Notification.create!(
        user:       instructor,
        studio:     template.studio,
        kind:       "class_template_approved",
        title:      "Your class \"#{template.title}\" was approved",
        body:       "You can now add sessions and make it available to clients.",
        action_url: "/templates/#{template.id}/sessions"
      )

      ClassTemplateMailer.with(instructor: instructor, template: template).class_approved.deliver_later

    when :class_template_rejected
      template = ClassTemplate.find_by(id: resource_id)
      return unless template

      instructor = template.instructor
      return unless instructor

      Notification.create!(
        user:       instructor,
        studio:     template.studio,
        kind:       "class_template_rejected",
        title:      "Update on your class \"#{template.title}\"",
        body:       "The studio owner has moved your class back to pending review.",
        action_url: "/templates"
      )

      ClassTemplateMailer.with(instructor: instructor, template: template).class_rejected.deliver_later

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
