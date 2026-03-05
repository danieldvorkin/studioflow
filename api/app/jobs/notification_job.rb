class NotificationJob < ApplicationJob
  queue_as :default

  def perform(kind, booking_id)
    case kind.to_sym
    when :booking_confirmation
      booking = Booking.find(booking_id)
      BookingMailer.with(booking: booking).confirmation.deliver_now
      instructor = booking.class_session.instructor
      BookingMailer.with(booking: booking).instructor_confirmation.deliver_now if instructor&.email.present?
    when :waitlist_promotion
      booking = Booking.find(booking_id)
      BookingMailer.with(booking: booking).waitlist_promotion.deliver_now
    when :booking_cancellation
      booking = Booking.find(booking_id)
      BookingMailer.with(booking: booking).cancellation.deliver_now
    else
      Rails.logger.warn("Unknown notification kind: #{kind}")
    end
  end
end
