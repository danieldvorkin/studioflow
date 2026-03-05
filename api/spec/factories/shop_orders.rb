FactoryBot.define do
  factory :shop_order do
    association :studio
    association :shop_item
    association :client
    quantity { 1 }
    total_cents { 2000 }
    currency { "cad" }
    status { "pending" }
    rental_due_date { nil }
    returned_at { nil }
    notes { nil }

    trait :paid do
      status { "paid" }
    end

    trait :cancelled do
      status { "cancelled" }
    end

    trait :returned do
      status { "returned" }
      returned_at { Date.today }
    end
  end
end
