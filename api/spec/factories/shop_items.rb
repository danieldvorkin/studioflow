FactoryBot.define do
  factory :shop_item do
    association :studio
    sequence(:title) { |n| "Shop Item #{n}" }
    description { "A great item for sale" }
    price_cents { 2000 }
    currency { "cad" }
    item_type { "sale" }
    stock_quantity { nil }  # unlimited
    active { true }
    image_url { nil }

    trait :rental do
      item_type { "rental" }
      description { "Available for rental" }
    end

    trait :limited_stock do
      stock_quantity { 10 }
    end

    trait :inactive do
      active { false }
    end
  end
end
