require 'rails_helper'

RSpec.describe BookingMailer, type: :mailer do
  let(:client) { create(:client, email: 'client@example.com') }
  let(:booking) { create(:booking, client: client) }

  it 'builds a confirmation email' do
    mail = described_class.with(booking: booking).confirmation
    expect(mail.to).to eq([ 'client@example.com' ])
    expect(mail.subject).to eq('Your booking is confirmed')
    expect(mail.from).to eq([ 'onboarding@resend.dev' ])
  end

  it 'builds a waitlist promotion email' do
    mail = described_class.with(booking: booking).waitlist_promotion
    expect(mail.to).to eq([ 'client@example.com' ])
    expect(mail.subject).to eq('You were promoted from the waitlist')
  end

  it 'builds a cancellation email' do
    mail = described_class.with(booking: booking).cancellation
    expect(mail.to).to eq([ 'client@example.com' ])
    expect(mail.subject).to eq('Your booking was cancelled')
  end
end
