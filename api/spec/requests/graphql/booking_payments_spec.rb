require 'rails_helper'

RSpec.describe 'Booking payments', type: :request do
  let(:studio) { create(:studio) }
  let(:staff) { create(:user, :staff, studio: studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }

  before do
    PaymentSetting.delete_all
    PaymentSetting.instance_for(studio).update!(
      default_currency: 'cad',
      enabled: true,
      stripe_publishable_key: 'pk_test_1',
      stripe_secret_key: 'sk_test_1'
    )

    sign_in(staff)
    allow(NotificationJob).to receive(:perform_now)
  end

  describe 'createBookingWithPayment mutation' do
    let(:mutation) do
      <<~GRAPHQL
        mutation($clientId: ID!, $classSessionId: ID!, $paymentMethodId: String) {
          createBookingWithPayment(input: { clientId: $clientId, classSessionId: $classSessionId, paymentMethodId: $paymentMethodId }) {
            booking { id status paid priceCents }
            payment { id status amountCents stripePaymentIntentId }
            errors
          }
        }
      GRAPHQL
    end

    it 'creates a paid booking and payment when Stripe succeeds' do
      template = create(:class_template, instructor: instructor, price_cents: 10_000, currency: 'cad')
      session = create(:class_session, class_template: template, instructor: instructor, start_time: Time.zone.parse('2026-02-28 10:00'))
      client = create(:client, studio: studio, stripe_default_payment_method_id: 'pm_default')

      intent = double('Stripe::PaymentIntent', status: 'succeeded', id: 'pi_123', to_hash: { 'id' => 'pi_123' })
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

      json = graphql_post(query: mutation, variables: { clientId: client.id.to_s, classSessionId: session.id.to_s, paymentMethodId: 'pm_123' })
      payload = json.dig('data', 'createBookingWithPayment')

      expect(payload['errors']).to eq([])
      expect(payload.dig('booking', 'paid')).to eq(true)
      expect(payload.dig('payment', 'stripePaymentIntentId')).to eq('pi_123')
      expect(NotificationJob).to have_received(:perform_now)
    end

    it 'rejects blocked instructor/client combinations before charging Stripe' do
      template = create(:class_template, instructor: instructor, price_cents: 10_000, currency: 'cad')
      session = create(:class_session, class_template: template, instructor: instructor, start_time: Time.zone.parse('2026-02-28 10:00'))
      client = create(:client, studio: studio)
      create(:instructor_client_block, instructor_id: instructor.id, client_id: client.id)

      allow(Stripe::PaymentIntent).to receive(:create)

      json = graphql_post(query: mutation, variables: { clientId: client.id.to_s, classSessionId: session.id.to_s, paymentMethodId: 'pm_123' })
      payload = json.dig('data', 'createBookingWithPayment')

      expect(payload['booking']).to be_nil
      expect(payload['errors'].join(' ')).to match(/blocked/i)
      expect(Stripe::PaymentIntent).not_to have_received(:create)
    end

    it 'returns an error when Stripe payment does not succeed' do
      template = create(:class_template, instructor: instructor, price_cents: 10_000, currency: 'cad')
      session = create(:class_session, class_template: template, instructor: instructor, start_time: Time.zone.parse('2026-02-28 10:00'))
      client = create(:client, studio: studio)

      intent = double('Stripe::PaymentIntent', status: 'requires_payment_method', id: 'pi_123', to_hash: {})
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

      json = graphql_post(query: mutation, variables: { clientId: client.id.to_s, classSessionId: session.id.to_s, paymentMethodId: 'pm_123' })
      payload = json.dig('data', 'createBookingWithPayment')
      expect(payload['booking']).to be_nil
      expect(payload['errors'].join(' ')).to match(/Payment did not succeed/i)
    end

    context 'as a client user (marketplace booking)' do
      let(:studio_a) { create(:studio, name: 'Studio A') }
      let(:studio_b) { create(:studio, name: 'Studio B') }
      let(:client_user) { create(:user, :client, studio: studio_a) }
      let(:instructor_b) { create(:user, :instructor, studio: studio_b) }

      let(:client_mutation) do
        <<~GRAPHQL
          mutation($clientId: ID, $classSessionId: ID!, $paymentMethodId: String) {
            createBookingWithPayment(input: { clientId: $clientId, classSessionId: $classSessionId, paymentMethodId: $paymentMethodId }) {
              booking { id status paid priceCents }
              payment { id status amountCents stripePaymentIntentId }
              errors
            }
          }
        GRAPHQL
      end

      before do
        sign_in(client_user)

        PaymentSetting.delete_all
        PaymentSetting.instance_for(studio_b).update!(
          default_currency: 'cad',
          enabled: true,
          stripe_publishable_key: 'pk_test_b',
          stripe_secret_key: 'sk_test_b'
        )
      end

      it 'allows booking with a new card without clientId (creates membership)' do
        template_b = create(:class_template, studio: studio_b, instructor: instructor_b, price_cents: 2_400, currency: 'cad')
        session_b = create(:class_session, studio: studio_b, class_template: template_b, instructor: instructor_b, start_time: 2.days.from_now)

        intent = double('Stripe::PaymentIntent', status: 'succeeded', id: 'pi_client_1', to_hash: { 'id' => 'pi_client_1' })
        allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

        json = graphql_post(query: client_mutation, variables: { clientId: nil, classSessionId: session_b.id.to_s, paymentMethodId: 'pm_123' })
        payload = json.dig('data', 'createBookingWithPayment')

        expect(payload['errors']).to eq([])

        booking_id = payload.dig('booking', 'id').to_i
        booking = Booking.find(booking_id)
        expect(booking.studio_id).to eq(studio_b.id)
        expect(booking.paid).to eq(true)
        expect(booking.client.user_id).to eq(client_user.id)
        expect(booking.client.studio_id).to eq(studio_b.id)
      end

      it 'allows booking using an existing membership clientId (saved-card style)' do
        template_b = create(:class_template, studio: studio_b, instructor: instructor_b, price_cents: 2_400, currency: 'cad')
        session_b = create(:class_session, studio: studio_b, class_template: template_b, instructor: instructor_b, start_time: 2.days.from_now)

        membership = create(:client, studio: studio_b, user: client_user, stripe_default_payment_method_id: 'pm_default')

        intent = double('Stripe::PaymentIntent', status: 'succeeded', id: 'pi_client_2', to_hash: { 'id' => 'pi_client_2' })
        allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

        json = graphql_post(query: client_mutation, variables: { clientId: membership.id.to_s, classSessionId: session_b.id.to_s, paymentMethodId: 'pm_default' })
        payload = json.dig('data', 'createBookingWithPayment')

        expect(payload['errors']).to eq([])
        expect(payload.dig('booking', 'paid')).to eq(true)
        expect(payload.dig('payment', 'stripePaymentIntentId')).to eq('pi_client_2')
      end
    end
  end

  describe 'rebookBookingWithPayment mutation' do
    let(:mutation) do
      <<~GRAPHQL
        mutation($id: ID!, $paymentMethodId: String) {
          rebookBookingWithPayment(input: { id: $id, paymentMethodId: $paymentMethodId }) {
            booking { id status paid archived }
            payment { id stripePaymentIntentId }
            errors
          }
        }
      GRAPHQL
    end

    it 'rebooks a cancelled booking with a new Stripe payment' do
      template = create(:class_template, instructor: instructor, price_cents: 10_000, currency: 'cad')
      session = create(:class_session, class_template: template, instructor: instructor, start_time: Time.zone.parse('2026-02-28 10:00'))
      client = create(:client, studio: studio, stripe_default_payment_method_id: 'pm_default')
      booking = create(:booking, class_session: session, client: client, status: Booking.statuses[:cancelled], archived: true, paid: false, price_cents: 10_000)

      intent = double('Stripe::PaymentIntent', status: 'succeeded', id: 'pi_456', to_hash: { 'id' => 'pi_456' })
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)

      json = graphql_post(query: mutation, variables: { id: booking.id.to_s, paymentMethodId: 'pm_123' })
      payload = json.dig('data', 'rebookBookingWithPayment')

      expect(payload['errors']).to eq([])
      expect(payload.dig('booking', 'status')).to eq('booked')
      expect(payload.dig('booking', 'archived')).to eq(false)
      expect(payload.dig('booking', 'paid')).to eq(true)
      expect(payload.dig('payment', 'stripePaymentIntentId')).to eq('pi_456')
    end
  end
end
