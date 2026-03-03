FactoryBot.define do
  factory :studio_subscription do
    association :studio
    tier { "basic" }
    status { "active" }
    stripe_customer_id { "cus_test_#{SecureRandom.hex(8)}" }
    stripe_subscription_id { "sub_test_#{SecureRandom.hex(8)}" }
    current_period_end { 30.days.from_now }
    cancelled_at { nil }
    notes { nil }

    trait :basic do
      tier { "basic" }
    end

    trait :premium do
      tier { "premium" }
    end

    trait :trialing do
      status { "trialing" }
    end

    trait :past_due do
      status { "past_due" }
    end

    trait :cancelled do
      status { "cancelled" }
      cancelled_at { 1.day.ago }
    end

    trait :suspended do
      status { "suspended" }
    end

    trait :no_stripe do
      stripe_customer_id { nil }
      stripe_subscription_id { nil }
    end
  end
end
