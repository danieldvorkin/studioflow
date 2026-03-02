class BookingMailer < ApplicationMailer
  default from: 'no-reply@pilates-studio.local'

  def confirmation
    @booking = params[:booking]
    mail(to: @booking.client.email, subject: 'Your booking is confirmed')
  end

  def waitlist_promotion
    @booking = params[:booking]
    mail(to: @booking.client.email, subject: 'You were promoted from the waitlist')
  end

  def cancellation
    @booking = params[:booking]
    mail(to: @booking.client.email, subject: 'Your booking was cancelled')
  end

  def payment_reminder
    @booking = params[:booking]
    @checkout_url = params[:checkout_url]
    mail(to: @booking.client.email, subject: 'Payment reminder for your class booking')
  end
end
