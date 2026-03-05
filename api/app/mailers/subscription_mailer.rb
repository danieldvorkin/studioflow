# frozen_string_literal: true

class SubscriptionMailer < ApplicationMailer
  # Sent 3 days before a trial expires
  def trial_ending(user:, subscription:)
    @user         = user
    @subscription = subscription
    @days_left    = ((subscription.current_period_end - Time.current) / 1.day).ceil
    @tier_label   = StudioSubscription::TIER_PRICES.dig(subscription.tier, :label) || subscription.tier.capitalize
    @billing_url  = "#{web_url}/owner/subscription"

    mail(to: user.email, subject: "Your #{@tier_label} trial ends in #{@days_left} day#{@days_left == 1 ? '' : 's'} — StudioFlow")
  end

  # Sent when a trial expires and no payment method was added
  def trial_expired(user:, subscription:)
    @user         = user
    @subscription = subscription
    @tier_label   = StudioSubscription::TIER_PRICES.dig(subscription.tier, :label) || subscription.tier.capitalize
    @billing_url  = "#{web_url}/owner/subscription"

    mail(to: user.email, subject: "Your #{@tier_label} trial has ended — StudioFlow")
  end

  # Sent when an invoice payment fails
  def payment_failed(user:, subscription:)
    @user         = user
    @subscription = subscription
    @tier_label   = StudioSubscription::TIER_PRICES.dig(subscription.tier, :label) || subscription.tier.capitalize
    @billing_url  = "#{web_url}/owner/subscription"

    mail(to: user.email, subject: "Payment failed for your StudioFlow subscription")
  end

  # Sent when a subscription is cancelled
  def subscription_cancelled(user:, subscription:)
    @user         = user
    @subscription = subscription
    @tier_label   = StudioSubscription::TIER_PRICES.dig(subscription.tier, :label) || subscription.tier.capitalize
    @billing_url  = "#{web_url}/owner/subscription"

    mail(to: user.email, subject: "Your StudioFlow #{@tier_label} subscription has been cancelled")
  end

  # Sent when payment succeeds / subscription is renewed
  def subscription_renewed(user:, subscription:)
    @user         = user
    @subscription = subscription
    @tier_label   = StudioSubscription::TIER_PRICES.dig(subscription.tier, :label) || subscription.tier.capitalize
    @period_end   = subscription.current_period_end

    mail(to: user.email, subject: "StudioFlow #{@tier_label} renewed — you're all set!")
  end

  private

  def web_url
    ENV.fetch("WEB_APP_URL", "https://app.joinstudioflow.com")
  end
end
