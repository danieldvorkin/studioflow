require 'rails_helper'

RSpec.describe BookingMailer, type: :mailer do
  let(:studio) { create(:studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:template) { create(:class_template, instructor: instructor, price_cents: 10_000, currency: 'cad', duration_minutes: 50) }
  let(:session) { create(:class_session, class_template: template, instructor: instructor, start_time: Time.zone.parse('2026-03-10 10:00')) }
  let(:client) { create(:client, email: 'client@example.com', studio: studio) }
  let(:booking) { create(:booking, client: client, class_session: session, studio: studio, price_cents: 10_000) }

  it 'builds a confirmation email with a booking link' do
    mail = described_class.with(booking: booking).confirmation
    expect(mail.to).to eq([ 'client@example.com' ])
    expect(mail.subject).to eq('Your booking is confirmed')
    expect(mail.from).to eq([ 'noreply@joinstudioflow.com' ])
    expect(mail.body.encoded).to include("/bookings/#{booking.id}")
  end

  it 'builds a waitlist promotion email' do
    mail = described_class.with(booking: booking).waitlist_promotion
    expect(mail.to).to eq([ 'client@example.com' ])
    expect(mail.subject).to eq("You're in — waitlist spot confirmed! 🎉")
  end

  it 'builds a cancellation email' do
    mail = described_class.with(booking: booking).cancellation
    expect(mail.to).to eq([ 'client@example.com' ])
    expect(mail.subject).to eq('Your booking was cancelled')
  end

  describe '#payment_reminder' do
    let(:checkout_url) { 'https://checkout.stripe.com/pay/test123' }

    it 'sends to the client with the correct subject' do
      mail = described_class.with(booking: booking, checkout_url: checkout_url).payment_reminder
      expect(mail.to).to eq([ 'client@example.com' ])
      expect(mail.subject).to eq('Payment reminder for your class booking')
    end

    it 'includes the Stripe checkout URL' do
      mail = described_class.with(booking: booking, checkout_url: checkout_url).payment_reminder
      expect(mail.body.encoded).to include(checkout_url)
    end

    it 'includes a link to the booking in the app' do
      mail = described_class.with(booking: booking, checkout_url: checkout_url).payment_reminder
      expect(mail.body.encoded).to include("/bookings/#{booking.id}")
    end

    it 'includes the class title and start time' do
      mail = described_class.with(booking: booking, checkout_url: checkout_url).payment_reminder
      expect(mail.body.encoded).to include(template.title)
      expect(mail.body.encoded).to include('March')
    end

    it 'includes the instructor name' do
      mail = described_class.with(booking: booking, checkout_url: checkout_url).payment_reminder
      expect(mail.body.encoded).to include(instructor.name)
    end
  end

  describe '#instructor_confirmation' do
    let(:instructor_user) { create(:user, :instructor, studio: studio, email: 'instructor@example.com') }
    let(:instructor_template) { create(:class_template, instructor: instructor_user, studio: studio) }
    let(:instructor_session) { create(:class_session, class_template: instructor_template, instructor: instructor_user) }
    let(:instructor_booking) { create(:booking, client: client, class_session: instructor_session, studio: studio) }

    it 'sends to the instructor' do
      mail = described_class.with(booking: instructor_booking).instructor_confirmation
      expect(mail.to).to eq([ 'instructor@example.com' ])
    end

    it 'includes a link to the booking in the app' do
      mail = described_class.with(booking: instructor_booking).instructor_confirmation
      expect(mail.body.encoded).to include("/bookings/#{instructor_booking.id}")
    end

    it 'includes the client name' do
      mail = described_class.with(booking: instructor_booking).instructor_confirmation
      expect(mail.body.encoded).to include(client.name)
    end
  end
end
