FactoryBot.define do
  factory :user do
    association :studio
    sequence(:email) { |n| "user#{n}@example.com" }
    password { "password123" }
    name { "Test User" }
    active { true }
    available_for_sessions { true }
    role { User::ROLES[:client] }

    trait :owner do
      role { User::ROLES[:owner] }
    end

    trait :staff do
      role { User::ROLES[:staff] }
    end

    trait :instructor do
      role { User::ROLES[:instructor] }
    end

    trait :client do
      role { User::ROLES[:client] }
    end
  end
end
