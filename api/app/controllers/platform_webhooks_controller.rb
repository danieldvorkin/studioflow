# frozen_string_literal: true

class PlatformWebhooksController < ApplicationController
  # Skip CSRF and authentication - Stripe verifies with signature
  skip_before_action :verify_authenticity_token, raise: false

  HANDLED_EVENTS = %w[
    checkout.session.completed
    customer.subscription.updated
    customer.subscription.deleted
    invoice.payment_succeeded
    invoice.payment_failed
  ].freeze

  def receive
    payload = request.body.read
    sig_header = request.headers["Stripe-Signature"]
    webhook_secret = ENV["PLATFORM_STRIPE_WEBHOOK_SECRET"].presence

    unless webhook_secret
      render json: { error: "Webhook secret not configured" }, status: :service_unavailable
      return
    end

    begin
      event = Stripe::Webhook.construct_event(payload, sig_header, webhook_secret)
    rescue JSON::ParserError
      render json: { error: "Invalid payload" }, status: :bad_request
      return
    rescue Stripe::SignatureVerificationError
      render json: { error: "Invalid signature" }, status: :unauthorized
      return
    end

    return render json: { skipped: true } unless HANDLED_EVENTS.include?(event.type)

    handle_event(event)
    render json: { received: true }
  rescue StandardError => e
    Rails.logger.error("[PlatformWebhook] Unhandled error: #{e.class}: #{e.message}")
    render json: { error: "Internal error" }, status: :internal_server_error
  end

  private

  def handle_event(event)
    case event.type
    when "checkout.session.completed"
      handle_checkout_completed(event.data.object)
    when "customer.subscription.updated"
      handle_subscription_updated(event.data.object)
    when "customer.subscription.deleted"
      handle_subscription_deleted(event.data.object)
    when "invoice.payment_succeeded"
      handle_invoice_paid(event.data.object)
    when "invoice.payment_failed"
      handle_invoice_failed(event.data.object)
    end
  end

  # Called once after first payment; activates the subscription
  def handle_checkout_completed(session)
    return unless session.mode == "subscription"

    studio_id = session.metadata&.[]("studio_id")
    tier      = session.metadata&.[]("tier")
    sub_id    = session.subscription
    cust_id   = session.customer

    return unless studio_id.present?

    sub = StudioSubscription.find_or_initialize_by(studio_id: studio_id)
    sub.tier                   = tier if tier.present?
    sub.stripe_customer_id     = cust_id
    sub.stripe_subscription_id = sub_id
    sub.cancelled_at           = nil

    # Fetch real status + period end from the Stripe subscription object
    # (status will be "trialing" when trial_period_days is set, "active" otherwise)
    if sub_id.present?
      Stripe.api_key = ENV["PLATFORM_STRIPE_SECRET_KEY"]
      stripe_sub = Stripe::Subscription.retrieve(sub_id)
      sub.status             = stripe_status_to_local(stripe_sub.status)
      sub.current_period_end = Time.at(stripe_sub.current_period_end).utc
    else
      sub.status = "trialing"
    end

    sub.save!
    Rails.logger.info("[PlatformWebhook] Checkout completed for studio #{studio_id} → #{sub.tier} / #{sub.status}")
  end

  def handle_subscription_updated(stripe_sub)
    sub = StudioSubscription.find_by(stripe_subscription_id: stripe_sub.id)
    return unless sub

    new_status = stripe_status_to_local(stripe_sub.status)
    old_status = sub.status
    sub.status = new_status
    sub.current_period_end = Time.at(stripe_sub.current_period_end).utc
    sub.cancelled_at = new_status == "cancelled" ? Time.current : nil
    sub.save!
    Rails.logger.info("[PlatformWebhook] Updated studio #{sub.studio_id} → #{new_status}")

    # Dispatch notification if status changed to cancelled
    if new_status == "cancelled" && old_status != "cancelled"
      NotificationJob.perform_later("subscription_cancelled", sub.id)
    end
  end

  def handle_subscription_deleted(stripe_sub)
    sub = StudioSubscription.find_by(stripe_subscription_id: stripe_sub.id)
    return unless sub

    sub.update!(status: "cancelled", cancelled_at: Time.current)
    Rails.logger.info("[PlatformWebhook] Cancelled studio #{sub.studio_id} subscription")

    NotificationJob.perform_later("subscription_cancelled", sub.id)
  end

  def handle_invoice_paid(invoice)
    return unless invoice.subscription.present?

    sub = StudioSubscription.find_by(stripe_subscription_id: invoice.subscription)
    return unless sub

    sub.status = "active"
    sub.current_period_end = Time.at(invoice.period_end).utc if invoice.period_end.present?
    sub.cancelled_at = nil
    sub.save!

    NotificationJob.perform_later("subscription_renewed", sub.id)
  end

  def handle_invoice_failed(invoice)
    return unless invoice.subscription.present?

    sub = StudioSubscription.find_by(stripe_subscription_id: invoice.subscription)
    return unless sub

    sub.update!(status: "past_due")
    Rails.logger.warn("[PlatformWebhook] Payment failed for studio #{sub.studio_id}")

    NotificationJob.perform_later("subscription_payment_failed", sub.id)
  end

  def stripe_status_to_local(stripe_status)
    case stripe_status
    when "active"   then "active"
    when "trialing" then "trialing"
    when "past_due" then "past_due"
    when "canceled", "cancelled", "unpaid", "incomplete_expired" then "cancelled"
    when "incomplete" then "past_due"
    else "suspended"
    end
  end
end
