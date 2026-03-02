FactoryBot.define do
  factory :booking do
    association :client
    association :class_session
    studio { client.studio }
    status { Booking.statuses[:booked] }
    archived { false }
    paid { false }
    price_cents { 0 }
  end
end
