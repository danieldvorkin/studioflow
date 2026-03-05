FactoryBot.define do
  factory :notification do
    association :user
    association :studio
    kind    { "general" }
    title   { "Test notification" }
    body    { "This is a test notification body." }
    action_url { nil }
    read_at    { nil }
    dismissed_at { nil }

    trait :unread do
      read_at { nil }
    end

    trait :read do
      read_at { 1.hour.ago }
    end

    trait :dismissed do
      read_at    { 1.hour.ago }
      dismissed_at { 1.hour.ago }
    end

    trait :trial_ending do
      kind  { "subscription_trial_ending" }
      title { "Your trial is ending soon — Pro" }
      body  { "Add a payment method to avoid losing access to premium features." }
      action_url { "/owner/subscription" }
    end

    trait :payment_failed do
      kind  { "subscription_payment_failed" }
      title { "Payment failed — Pro" }
      body  { "We couldn't process your payment. Please update your payment method." }
      action_url { "/owner/subscription" }
    end

    trait :subscription_cancelled do
      kind  { "subscription_cancelled" }
      title { "Subscription cancelled — Pro" }
      body  { "Your subscription has been cancelled. You're now on the Starter plan." }
      action_url { "/owner/subscription" }
    end

    trait :class_reminder do
      kind  { "class_reminder" }
      title { "Morning Flow coming up soon" }
      body  { "8/12 clients booked for today at 8:00 AM." }
      action_url { "/schedule" }
    end

    trait :booking_confirmed do
      kind  { "booking_confirmed" }
      title { "New booking – Morning Flow" }
      body  { "A client booked Morning Flow." }
      action_url { "/schedule" }
    end

    trait :booking_cancelled do
      kind  { "booking_cancelled" }
      title { "Booking cancelled – Evening Stretch" }
      body  { "A client cancelled their booking." }
      action_url { "/schedule" }
    end

    trait :new_client_joined do
      kind  { "new_client_joined" }
      title { "New client joined" }
      body  { "A new client just created an account at your studio." }
      action_url { "/clients" }
    end

    trait :membership_expiring do
      kind  { "membership_expiring" }
      title { "Membership expiring soon" }
      body  { "A client's membership expires in 3 days." }
      action_url { "/clients" }
    end

    trait :studio_milestone do
      kind  { "studio_milestone" }
      title { "100 bookings milestone!" }
      body  { "Your studio just hit 100 total bookings." }
      action_url { "/dashboard" }
    end
  end
end
