FactoryBot.define do
  factory :membership_plan do
    association :studio
    sequence(:name) { |n| "Plan #{n}" }
    description     { "A great membership plan" }
    price_cents     { 13_900 }
    currency        { "cad" }
    reformer_classes_per_month { 4 }
    mat_classes_per_month      { nil }
    includes_priority_booking  { false }
    includes_early_booking     { false }
    private_session_discount_percent { 0 }
    guest_passes_per_month     { 0 }
    includes_retail_discount   { false }
    min_commitment_months      { 3 }
    auto_renew                 { true }
    active                     { false }
    position                   { 0 }

    trait :essential do
      name       { "Essential Membership" }
      price_cents { 13_900 }
      reformer_classes_per_month { 4 }
    end

    trait :signature do
      name       { "Signature Membership" }
      price_cents { 22_900 }
      reformer_classes_per_month { 8 }
      mat_classes_per_month      { 1 }
      includes_priority_booking  { true }
    end

    trait :elite do
      name       { "Elite Membership" }
      price_cents { 28_900 }
      reformer_classes_per_month { 12 }
      mat_classes_per_month      { nil }   # unlimited
      private_session_discount_percent { 10 }
      includes_early_booking     { true }
    end

    trait :unlimited do
      name       { "Unlimited Membership" }
      price_cents { 33_900 }
      reformer_classes_per_month { nil }   # unlimited
      mat_classes_per_month      { nil }   # unlimited
      private_session_discount_percent { 15 }
      guest_passes_per_month     { 1 }
      includes_retail_discount   { true }
    end

    trait :published do
      active { true }
    end
  end
end
