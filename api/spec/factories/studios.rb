FactoryBot.define do
  factory :studio do
    sequence(:name) { |n| "Studio #{n}" }
    sequence(:slug) { |n| "studio-#{n}" }
  end
end
