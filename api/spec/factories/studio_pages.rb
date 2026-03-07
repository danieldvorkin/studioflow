# frozen_string_literal: true

FactoryBot.define do
  factory :studio_page do
    association :studio
    sequence(:title) { |n| "Page #{n}" }
    content { "<p>Hello world</p>" }
    published { false }
    position { 0 }

    trait :published do
      published { true }
    end
  end
end
