# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UserMailer, type: :mailer do
  let(:studio) { create(:studio) }

  describe '#moderator_welcome' do
    let(:mod) { create(:user, :moderator, email: 'mod@studioflow.io', name: 'Platform Mod', studio: studio) }
    let(:plaintext) { 'TempP@ss12345678901' }
    let(:mail) { described_class.with(user: mod, plaintext_password: plaintext).moderator_welcome }

    it 'sends to the moderator email address' do
      expect(mail.to).to eq([ 'mod@studioflow.io' ])
    end

    it 'uses the correct subject' do
      expect(mail.subject).to eq("You've been added as a StudioFlow Moderator")
    end

    it 'sends from the default noreply address' do
      expect(mail.from).to eq([ 'noreply@joinstudioflow.com' ])
    end

    it 'includes the moderator email in the body' do
      expect(mail.body.encoded).to include('mod@studioflow.io')
    end

    it 'includes the plaintext password in the body' do
      expect(mail.body.encoded).to include(plaintext)
    end

    it 'links to /signin (not /login)' do
      expect(mail.body.encoded).to include('/signin')
      expect(mail.body.encoded).not_to include('/login')
    end

    context 'in development environment' do
      it 'uses localhost for the sign-in URL' do
        dev_mail = described_class.with(user: mod, plaintext_password: plaintext).moderator_welcome
        expect(dev_mail.body.encoded).to include('localhost')
      end
    end

    context 'in production environment' do
      it 'uses the APP_HOST env var for the sign-in URL' do
        original = ENV.fetch('APP_HOST', nil)
        ENV['APP_HOST'] = 'joinstudioflow.com'

        allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('production'))
        prod_mail = described_class.with(user: mod, plaintext_password: plaintext).moderator_welcome
        expect(prod_mail.body.encoded).to include('joinstudioflow.com/signin')
      ensure
        ENV['APP_HOST'] = original
      end
    end
  end

  describe '#signup_confirmation' do
    let(:owner) { create(:user, :owner, email: 'owner@example.com', studio: studio) }
    let(:mail) { described_class.with(user: owner, studio: studio).signup_confirmation }

    it 'sends to the owner email address' do
      expect(mail.to).to eq([ 'owner@example.com' ])
    end

    it 'uses a welcome subject' do
      expect(mail.subject).to eq("Welcome to StudioFlow \u2014 your studio is ready!")
    end

    it 'links to /signin (not /login)' do
      expect(mail.body.encoded).to include('/signin')
      expect(mail.body.encoded).not_to include('/login')
    end
  end
end
