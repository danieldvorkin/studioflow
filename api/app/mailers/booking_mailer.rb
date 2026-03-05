class BookingMailer < ApplicationMailer
  default from: ENV.fetch("MAILER_FROM", "onboarding@resend.dev")

  def confirmation
    @booking = params[:booking]
    @booking_url = booking_url_for(@booking)
    mail(to: @booking.client.email, subject: "Your booking is confirmed")
  end

  def instructor_confirmation
    @booking = params[:booking]
    @booking_url = booking_url_for(@booking)
    instructor = @booking.class_session.instructor
    return unless instructor&.email.present?
    mail(to: instructor.email, subject: "New booking: #{@booking.class_session.class_template&.title || 'a class'}")
  end

  def waitlist_promotion
    @booking = params[:booking]
    mail(to: @booking.client.email, subject: "You were promoted from the waitlist")
  end

  def cancellation
    @booking = params[:booking]
    mail(to: @booking.client.email, subject: "Your booking was cancelled")
  end

  def payment_reminder
    @booking = params[:booking]
    @checkout_url = params[:checkout_url]
    @booking_url = booking_url_for(@booking)
    mail(to: @booking.client.email, subject: "Payment reminder for your class booking")
  end

  private

  def booking_url_for(booking)
    host = ENV.fetch("APP_HOST", "localhost:5173")
    protocol = Rails.env.development? ? "http" : "https"
    "#{protocol}://#{host}/bookings/#{booking.id}"
  end
end
