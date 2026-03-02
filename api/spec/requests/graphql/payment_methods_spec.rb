require 'rails_helper'

RSpec.describe 'Payment methods', type: :request do
  let(:studio) { create(:studio) }
  let(:user) { create(:user, :client, studio: studio) }

  before do
    PaymentSetting.delete_all
    PaymentSetting.instance_for(studio).update!(
      default_currency: 'cad',
      enabled: true,
      stripe_publishable_key: 'pk_test_1',
      stripe_secret_key: 'sk_test_1'
    )

    sign_in(user)
  end

  describe 'createSetupIntent mutation' do
    let(:mutation) do
      <<~GRAPHQL
        mutation {
          createSetupIntent(input: {}) {
            clientSecret
            client { id stripeCustomerId }
            errors
          }
        }
      GRAPHQL
    end

    it 'creates a Stripe customer and setup intent for the signed-in user' do
      create(:client, studio: studio, user: user)

      allow(Stripe::Customer).to receive(:create).and_return(double('Stripe::Customer', id: 'cus_123'))
      allow(Stripe::SetupIntent).to receive(:create).and_return(double('Stripe::SetupIntent', client_secret: 'seti_secret'))

      json = graphql_post(query: mutation)
      payload = json.dig('data', 'createSetupIntent')
      expect(payload['errors']).to eq([])
      expect(payload['clientSecret']).to eq('seti_secret')
      expect(payload.dig('client', 'stripeCustomerId')).to eq('cus_123')
    end
  end

  describe 'saveMyPaymentMethod mutation' do
    let(:mutation) do
      <<~GRAPHQL
        mutation($paymentMethodId: String!) {
          saveMyPaymentMethod(input: { paymentMethodId: $paymentMethodId }) {
            client { id stripeDefaultPaymentMethodId }
            errors
          }
        }
      GRAPHQL
    end

    it 'attaches a payment method and stores it locally as default' do
      client = create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')

      card = double('Stripe::Card', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030)
      pm_unattached = double('Stripe::PaymentMethod', customer: nil, card: card)
      pm_attached = double('Stripe::PaymentMethod', customer: 'cus_123', card: card)

      allow(Stripe::PaymentMethod).to receive(:retrieve).and_return(pm_unattached, pm_attached)
      allow(Stripe::PaymentMethod).to receive(:attach).and_return(true)
      allow(Stripe::Customer).to receive(:update).and_return(true)

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_123' })
      payload = json.dig('data', 'saveMyPaymentMethod')
      expect(payload['errors']).to eq([])

      expect(client.reload.stripe_default_payment_method_id).to eq('pm_123')
      record = client.client_payment_methods.find_by(stripe_payment_method_id: 'pm_123')
      expect(record).to be_present
      expect(record.default).to eq(true)
    end
  end

  describe 'setMyDefaultPaymentMethod mutation' do
    let(:mutation) do
      <<~GRAPHQL
        mutation($paymentMethodId: String!) {
          setMyDefaultPaymentMethod(input: { paymentMethodId: $paymentMethodId }) {
            client { id stripeDefaultPaymentMethodId }
            errors
          }
        }
      GRAPHQL
    end

    it 'switches the default payment method locally and on Stripe' do
      client = create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')
      pm1 = client.client_payment_methods.create!(studio: studio, stripe_payment_method_id: 'pm_1', brand: 'visa', last4: '1111', exp_month: 1, exp_year: 2030, default: true)
      pm2 = client.client_payment_methods.create!(studio: studio, stripe_payment_method_id: 'pm_2', brand: 'visa', last4: '2222', exp_month: 2, exp_year: 2030, default: false)
      client.update!(stripe_default_payment_method_id: pm1.stripe_payment_method_id)

      allow(Stripe::Customer).to receive(:update).and_return(true)

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_2' })
      payload = json.dig('data', 'setMyDefaultPaymentMethod')
      expect(payload['errors']).to eq([])
      expect(client.reload.stripe_default_payment_method_id).to eq('pm_2')
      expect(pm1.reload.default).to eq(false)
      expect(pm2.reload.default).to eq(true)
    end
  end

  describe 'removeMyPaymentMethod mutation' do
    let(:mutation) do
      <<~GRAPHQL
        mutation($paymentMethodId: String) {
          removeMyPaymentMethod(input: { paymentMethodId: $paymentMethodId }) {
            client { id stripeDefaultPaymentMethodId }
            errors
          }
        }
      GRAPHQL
    end

    it 'removes a payment method and selects a new default if available' do
      client = create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')
      pm1 = client.client_payment_methods.create!(studio: studio, stripe_payment_method_id: 'pm_1', brand: 'visa', last4: '1111', exp_month: 1, exp_year: 2030, default: true)
      pm2 = client.client_payment_methods.create!(studio: studio, stripe_payment_method_id: 'pm_2', brand: 'visa', last4: '2222', exp_month: 2, exp_year: 2030, default: false)
      client.update!(
        stripe_default_payment_method_id: pm1.stripe_payment_method_id,
        stripe_default_payment_method_brand: pm1.brand,
        stripe_default_payment_method_last4: pm1.last4,
        stripe_default_payment_method_exp_month: pm1.exp_month,
        stripe_default_payment_method_exp_year: pm1.exp_year
      )

      allow(Stripe::Customer).to receive(:update).and_return(true)

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_1' })
      payload = json.dig('data', 'removeMyPaymentMethod')
      expect(payload['errors']).to eq([])

      expect(client.reload.stripe_default_payment_method_id).to eq('pm_2')
      expect(client.client_payment_methods.find_by(stripe_payment_method_id: 'pm_1')).to be_nil
      expect(pm2.reload.default).to eq(true)
    end

    it 'clears defaults when removing the last saved card' do
      client = create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')
      pm1 = client.client_payment_methods.create!(studio: studio, stripe_payment_method_id: 'pm_1', brand: 'visa', last4: '1111', exp_month: 1, exp_year: 2030, default: true)
      client.update!(stripe_default_payment_method_id: pm1.stripe_payment_method_id)

      allow(Stripe::Customer).to receive(:update).and_return(true)

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_1' })
      payload = json.dig('data', 'removeMyPaymentMethod')
      expect(payload['errors']).to eq([])
      expect(client.reload.stripe_default_payment_method_id).to be_nil
    end
  end
end
