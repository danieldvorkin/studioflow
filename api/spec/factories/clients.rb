FactoryBot.define do
  factory :client do
    association :studio
    sequence(:name) { |n| "Client #{n}" }
    sequence(:email) { |n| "client#{n}@example.com" }
    phone { "555-555-5555" }
    user { nil }
  end
end
