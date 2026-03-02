class NotificationJob < ApplicationJob
  queue_as :default

  def perform(kind, booking_id)
    case kind.to_sym
    when :booking_confirmation
      booking = Booking.find(booking_id)
      BookingMailer.with(booking: booking).confirmation.deliver_later
    when :waitlist_promotion
      booking = Booking.find(booking_id)
      BookingMailer.with(booking: booking).waitlist_promotion.deliver_later
    when :booking_cancellation
      booking = Booking.find(booking_id)
      BookingMailer.with(booking: booking).cancellation.deliver_later
    else
      Rails.logger.warn("Unknown notification kind: #{kind}")
    end
  end
end
