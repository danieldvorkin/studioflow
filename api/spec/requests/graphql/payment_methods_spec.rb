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

  # ---------------------------------------------------------------------------
  # createSetupIntent
  # ---------------------------------------------------------------------------
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

    it 'reuses an existing Stripe customer instead of creating a new one' do
      create(:client, studio: studio, user: user, stripe_customer_id: 'cus_existing')

      expect(Stripe::Customer).not_to receive(:create)
      allow(Stripe::SetupIntent).to receive(:create).and_return(double('Stripe::SetupIntent', client_secret: 'seti_secret'))

      json = graphql_post(query: mutation)
      payload = json.dig('data', 'createSetupIntent')
      expect(payload['errors']).to eq([])
      expect(payload.dig('client', 'stripeCustomerId')).to eq('cus_existing')
    end

    it 'returns an error when no client record exists for the user' do
      # No client record created — owner/instructor scenario
      json = graphql_post(query: mutation)
      payload = json.dig('data', 'createSetupIntent')
      expect(payload['errors']).not_to be_empty
      expect(payload['clientSecret']).to be_nil
    end

    it 'returns an error when Stripe is not configured for the studio' do
      create(:client, studio: studio, user: user)
      PaymentSetting.instance_for(studio).update!(stripe_secret_key: nil, stripe_publishable_key: nil)

      json = graphql_post(query: mutation)
      payload = json.dig('data', 'createSetupIntent')
      expect(payload['errors']).to include('Stripe is not configured')
    end

    it 'returns an error when Stripe raises an error' do
      create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')

      allow(Stripe::SetupIntent).to receive(:create).and_raise(Stripe::StripeError.new('stripe boom'))

      json = graphql_post(query: mutation)
      payload = json.dig('data', 'createSetupIntent')
      expect(payload['errors']).to include('stripe boom')
    end

    it 'returns an error when not authenticated' do
      sign_out(user)
      json = graphql_post(query: mutation)
      payload = json.dig('data', 'createSetupIntent')
      expect(payload['errors']).to include('Not authenticated')
    end
  end

  # ---------------------------------------------------------------------------
  # saveMyPaymentMethod
  # ---------------------------------------------------------------------------
  describe 'saveMyPaymentMethod mutation' do
    let(:mutation) do
      <<~GRAPHQL
        mutation($paymentMethodId: String!, $studioId: ID) {
          saveMyPaymentMethod(input: { paymentMethodId: $paymentMethodId, studioId: $studioId }) {
            client { id stripeDefaultPaymentMethodId }
            errors
          }
        }
      GRAPHQL
    end

    let(:card) { double('Stripe::Card', brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030) }
    let(:pm_unattached) { double('Stripe::PaymentMethod', customer: nil, card: card) }
    let(:pm_attached) { double('Stripe::PaymentMethod', customer: 'cus_123', card: card) }

    it 'attaches a payment method and stores it locally as default' do
      client = create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')

      allow(Stripe::PaymentMethod).to receive(:retrieve).and_return(pm_unattached, pm_attached)
      allow(Stripe::PaymentMethod).to receive(:attach).and_return(true)
      allow(Stripe::Customer).to receive(:update).and_return(true)

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_123' })
      payload = json.dig('data', 'saveMyPaymentMethod')
      expect(payload['errors']).to eq([])

      expect(client.reload.stripe_default_payment_method_id).to eq('pm_123')
      record = client.client_payment_methods.find_by(stripe_payment_method_id: 'pm_123')
      expect(record).to be_present
      expect(record.brand).to eq('visa')
      expect(record.last4).to eq('4242')
      expect(record.exp_month).to eq(12)
      expect(record.exp_year).to eq(2030)
      expect(record.default).to eq(true)
    end

    it 'skips Stripe attach when payment method is already attached to the customer' do
      client = create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')
      pm_already_attached = double('Stripe::PaymentMethod', customer: 'cus_123', card: card)

      allow(Stripe::PaymentMethod).to receive(:retrieve).and_return(pm_already_attached, pm_already_attached)
      expect(Stripe::PaymentMethod).not_to receive(:attach)
      allow(Stripe::Customer).to receive(:update).and_return(true)

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_123' })
      payload = json.dig('data', 'saveMyPaymentMethod')
      expect(payload['errors']).to eq([])
      expect(client.reload.stripe_default_payment_method_id).to eq('pm_123')
    end

    it 'marks previously saved cards as non-default when a new one is added' do
      client = create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')
      old_pm = client.client_payment_methods.create!(
        studio: studio, stripe_payment_method_id: 'pm_old', brand: 'mastercard',
        last4: '9999', exp_month: 1, exp_year: 2029, default: true
      )

      allow(Stripe::PaymentMethod).to receive(:retrieve).and_return(pm_unattached, pm_attached)
      allow(Stripe::PaymentMethod).to receive(:attach).and_return(true)
      allow(Stripe::Customer).to receive(:update).and_return(true)

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_new' })
      payload = json.dig('data', 'saveMyPaymentMethod')
      expect(payload['errors']).to eq([])
      expect(old_pm.reload.default).to eq(false)
      expect(client.client_payment_methods.find_by(stripe_payment_method_id: 'pm_new').default).to eq(true)
    end

    it 'returns an error when no client record exists for the user' do
      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_123' })
      payload = json.dig('data', 'saveMyPaymentMethod')
      expect(payload['errors']).not_to be_empty
      expect(payload['client']).to be_nil
    end

    it 'returns an error when stripe_customer_id is not set' do
      create(:client, studio: studio, user: user) # no stripe_customer_id

      allow(Stripe::PaymentMethod).to receive(:retrieve).and_return(pm_unattached)
      allow(Stripe::PaymentMethod).to receive(:attach).and_return(true)
      allow(Stripe::Customer).to receive(:update).and_return(true)

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_123' })
      payload = json.dig('data', 'saveMyPaymentMethod')
      expect(payload['errors']).to include('Stripe customer is not initialized')
    end

    it 'returns an error when the payment method belongs to a different customer' do
      create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')
      pm_wrong_customer = double('Stripe::PaymentMethod', customer: 'cus_DIFFERENT', card: card)

      allow(Stripe::PaymentMethod).to receive(:retrieve).and_return(pm_wrong_customer)

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_123' })
      payload = json.dig('data', 'saveMyPaymentMethod')
      expect(payload['errors']).to include('Payment method belongs to a different customer')
    end

    it 'returns an error when Stripe raises a StripeError' do
      create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')

      allow(Stripe::PaymentMethod).to receive(:retrieve).and_raise(Stripe::StripeError.new('card declined'))

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_bad' })
      payload = json.dig('data', 'saveMyPaymentMethod')
      expect(payload['errors']).to include('card declined')
    end

    it 'returns an error when not authenticated' do
      sign_out(user)
      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_123' })
      payload = json.dig('data', 'saveMyPaymentMethod')
      expect(payload['errors']).to include('Not authenticated')
    end

    it 'resolves the correct client when studioId is passed explicitly' do
      client = create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')

      allow(Stripe::PaymentMethod).to receive(:retrieve).and_return(pm_unattached, pm_attached)
      allow(Stripe::PaymentMethod).to receive(:attach).and_return(true)
      allow(Stripe::Customer).to receive(:update).and_return(true)

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_123', studioId: studio.id.to_s })
      payload = json.dig('data', 'saveMyPaymentMethod')
      expect(payload['errors']).to eq([])
      expect(client.reload.stripe_default_payment_method_id).to eq('pm_123')
    end
  end

  # ---------------------------------------------------------------------------
  # setMyDefaultPaymentMethod
  # ---------------------------------------------------------------------------
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

    it 'returns an error when the payment method record is not found' do
      create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')

      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_nonexistent' })
      payload = json.dig('data', 'setMyDefaultPaymentMethod')
      expect(payload['errors']).to include('Payment method not found')
    end

    it 'returns an error when no client record exists for the user' do
      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_1' })
      payload = json.dig('data', 'setMyDefaultPaymentMethod')
      expect(payload['errors']).not_to be_empty
      expect(payload['client']).to be_nil
    end

    it 'returns an error when not authenticated' do
      sign_out(user)
      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_1' })
      payload = json.dig('data', 'setMyDefaultPaymentMethod')
      expect(payload['errors']).to include('Not authenticated')
    end
  end

  # ---------------------------------------------------------------------------
  # removeMyPaymentMethod
  # ---------------------------------------------------------------------------
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

    it 'returns an error when no client record exists for the user' do
      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_1' })
      payload = json.dig('data', 'removeMyPaymentMethod')
      expect(payload['errors']).not_to be_empty
      expect(payload['client']).to be_nil
    end

    it 'returns an error for no saved card when payment_method_id is blank and client has no default' do
      create(:client, studio: studio, user: user, stripe_customer_id: 'cus_123')

      json = graphql_post(query: mutation, variables: {})
      payload = json.dig('data', 'removeMyPaymentMethod')
      expect(payload['errors']).to include('No saved card on file')
    end

    it 'returns an error when not authenticated' do
      sign_out(user)
      json = graphql_post(query: mutation, variables: { paymentMethodId: 'pm_1' })
      payload = json.dig('data', 'removeMyPaymentMethod')
      expect(payload['errors']).to include('Not authenticated')
    end
  end
end
