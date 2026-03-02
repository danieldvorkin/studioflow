require 'rails_helper'
require 'ostruct'

RSpec.describe 'Stripe connect and payouts', type: :request do
  let(:studio) { create(:studio) }
  let(:owner) { create(:user, :owner, studio: studio) }
  let(:instructor) { create(:user, :instructor, studio: studio, stripe_connect_onboarding_completed: false) }

  before do
    PaymentSetting.delete_all
    PaymentSetting.instance_for(studio).update!(
      default_currency: 'cad',
      enabled: true,
      stripe_publishable_key: 'pk_test_1',
      stripe_secret_key: 'sk_test_1'
    )

    sign_in(owner)
  end

  describe 'updatePaymentSettings mutation' do
    let(:mutation) do
      <<~GRAPHQL
        mutation($enabled: Boolean, $stripeSecretKey: String) {
          updatePaymentSettings(input: { enabled: $enabled, stripeSecretKey: $stripeSecretKey }) {
            paymentSettings { id enabled configured defaultCurrency stripePublishableKey }
            errors
          }
        }
      GRAPHQL
    end

    it 'does not clear secrets unless explicitly provided' do
      PaymentSetting.instance_for(studio).update!(stripe_secret_key: 'sk_test_1', enabled: true)

      json = graphql_post(query: mutation, variables: { enabled: true })
      payload = json.dig('data', 'updatePaymentSettings')
      expect(payload['errors']).to eq([])
      expect(payload.dig('paymentSettings', 'enabled')).to eq(true)

      expect(PaymentSetting.instance_for(studio).reload.stripe_secret_key).to eq('sk_test_1')
    end

    it 'updates secret when explicitly provided' do
      json = graphql_post(query: mutation, variables: { stripeSecretKey: 'sk_test_new' })
      payload = json.dig('data', 'updatePaymentSettings')
      expect(payload['errors']).to eq([])
      expect(PaymentSetting.instance_for(studio).reload.stripe_secret_key).to eq('sk_test_new')
    end
  end

  describe 'createInstructorConnectOnboarding mutation' do
    let(:mutation) do
      <<~GRAPHQL
        mutation($instructorId: ID!) {
          createInstructorConnectOnboarding(input: { instructorId: $instructorId }) {
            instructor { id stripeConnectAccountId stripeConnectOnboardingCompleted }
            onboardingUrl
            errors
          }
        }
      GRAPHQL
    end

    it 'creates an express account and onboarding link when missing' do
      allow(Stripe::Account).to receive(:create).and_return(double('Stripe::Account', id: 'acct_123'))
      allow(Stripe::AccountLink).to receive(:create).and_return(double('Stripe::AccountLink', url: 'https://stripe.example/onboard'))

      json = graphql_post(query: mutation, variables: { instructorId: instructor.id.to_s })
      payload = json.dig('data', 'createInstructorConnectOnboarding')
      expect(payload['errors']).to eq([])
      expect(payload['onboardingUrl']).to eq('https://stripe.example/onboard')
      expect(instructor.reload.stripe_connect_account_id).to eq('acct_123')
      expect(instructor.stripe_connect_onboarding_completed).to eq(false)
    end
  end

  describe 'refreshInstructorConnectStatus mutation' do
    let(:mutation) do
      <<~GRAPHQL
        mutation($instructorId: ID!) {
          refreshInstructorConnectStatus(input: { instructorId: $instructorId }) {
            instructor { id stripeConnectOnboardingCompleted }
            errors
          }
        }
      GRAPHQL
    end

    it 'marks onboarding completed when Stripe account has details_submitted' do
      instructor.update!(stripe_connect_account_id: 'acct_123', stripe_connect_onboarding_completed: false)
      allow(Stripe::Account).to receive(:retrieve).and_return(double('Stripe::Account', details_submitted: true))

      json = graphql_post(query: mutation, variables: { instructorId: instructor.id.to_s })
      payload = json.dig('data', 'refreshInstructorConnectStatus')
      expect(payload['errors']).to eq([])
      expect(instructor.reload.stripe_connect_onboarding_completed).to eq(true)
    end
  end

  describe 'payInstructorPayout mutation' do
    let(:mutation) do
      <<~GRAPHQL
        mutation($id: ID!) {
          payInstructorPayout(input: { id: $id }) {
            payout { id status stripeTransferId paidMethod paidReference }
            errors
          }
        }
      GRAPHQL
    end

    it 'pays via Stripe transfer when instructor is connected' do
      instructor.update!(stripe_connect_account_id: 'acct_123', stripe_connect_onboarding_completed: true)
      payout = InstructorPayout.create!(
        studio: studio,
        instructor: instructor,
        created_by: owner,
        week_start: Date.parse('2026-02-23'),
        week_end: Date.parse('2026-03-01'),
        currency: 'cad',
        gross_cents: 10_000,
        instructor_earnings_cents: 6_000,
        studio_cut_cents: 4_000,
        status: 'draft'
      )

      transfer = double('Stripe::Transfer', id: 'tr_123', to_hash: { 'id' => 'tr_123' })
      allow(Stripe::Transfer).to receive(:create).and_return(transfer)

      json = graphql_post(query: mutation, variables: { id: payout.id.to_s })
      payload = json.dig('data', 'payInstructorPayout')
      expect(payload['errors']).to eq([])
      expect(payout.reload.status).to eq('paid')
      expect(payout.stripe_transfer_id).to eq('tr_123')
      expect(payout.paid_method).to eq('stripe_transfer')
    end

    it 'marks payout failed and returns actionable message for insufficient balance' do
      instructor.update!(stripe_connect_account_id: 'acct_123', stripe_connect_onboarding_completed: true)
      payout = InstructorPayout.create!(
        studio: studio,
        instructor: instructor,
        created_by: owner,
        week_start: Date.parse('2026-02-23'),
        week_end: Date.parse('2026-03-01'),
        currency: 'cad',
        gross_cents: 10_000,
        instructor_earnings_cents: 6_000,
        studio_cut_cents: 4_000,
        status: 'draft'
      )

      test_error_class = Class.new(Stripe::StripeError) do
        attr_reader :error, :request_id

        def initialize(message, code: nil, request_id: nil)
          super(message)
          @error = OpenStruct.new(code: code)
          @request_id = request_id
        end
      end

      allow(Stripe::Transfer).to receive(:create).and_raise(test_error_class.new('Insufficient funds', code: 'balance_insufficient', request_id: 'req_123'))

      json = graphql_post(query: mutation, variables: { id: payout.id.to_s })
      payload = json.dig('data', 'payInstructorPayout')
      expect(payload['payout']['status']).to eq('failed')
      expect(payload['errors'].join(' ')).to match(/insufficient/i)
      expect(payload['errors'].join(' ')).to match(/request_id=req_123/i)
    end
  end
end
