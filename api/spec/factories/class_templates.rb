FactoryBot.define do
  factory :class_template do
    studio { instructor.studio }
    sequence(:title) { |n| "Reformer Basics #{n}" }
    description { "A Pilates class" }
    capacity { 12 }
    duration_minutes { 50 }
    price_cents { 0 }
    currency { "cad" }
    approved { true }

    association :instructor, factory: %i[user instructor]

    transient do
      with_location { false }
    end

    studio_location do
      if with_location
        association(:studio_location, studio: studio)
      end
    end
  end
end
