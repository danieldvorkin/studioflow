FactoryBot.define do
  factory :client_membership do
    association :studio
    association :client
    association :membership_plan
    status     { "active" }
    started_at { Date.today }

    trait :active    do status { "active" }    end
    trait :paused    do status { "paused" }    end
    trait :cancelled do
      status       { "cancelled" }
      cancelled_at { Time.current }
    end
    trait :expired   do status { "expired" }   end
  end
end
