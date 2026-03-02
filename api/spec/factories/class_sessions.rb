FactoryBot.define do
  factory :class_session do
    association :class_template
    studio { class_template.studio }
    start_time { 2.days.from_now.change(sec: 0) }
    end_time { start_time + class_template.duration_minutes.minutes }
    instructor { class_template.instructor }
    capacity { nil }
    room { "Room A" }
  end
end
