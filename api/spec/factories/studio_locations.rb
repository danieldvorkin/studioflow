FactoryBot.define do
  factory :studio_location do
    association :studio
    sequence(:name) { |n| "Studio #{n}" }
    address { "123 Main St" }
    city { "Toronto" }
    state { "ON" }
    zip { "M1M1M1" }
  end
end
