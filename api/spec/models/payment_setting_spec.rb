require 'rails_helper'

RSpec.describe PaymentSetting, type: :model do
  describe '.instance' do
    let!(:studio) { create(:studio) }

    around do |example|
      old = ENV.to_h
      begin
        ENV.delete('STRIPE_PUBLISHABLE_KEY')
        ENV.delete('STRIPE_SECRET_KEY')
        ENV.delete('STRIPE_WEBHOOK_SECRET')
        example.run
      ensure
        ENV.replace(old)
      end
    end

    it 'creates a singleton row and hydrates keys from ENV once' do
      PaymentSetting.delete_all

      ENV['STRIPE_PUBLISHABLE_KEY'] = 'pk_test_123'
      ENV['STRIPE_SECRET_KEY'] = 'sk_test_123'
      ENV['STRIPE_WEBHOOK_SECRET'] = 'whsec_123'

      setting = described_class.instance_for(studio)
      expect(setting).to be_persisted
      expect(setting.default_currency).to eq('cad')
      expect(setting.stripe_publishable_key).to eq('pk_test_123')
      expect(setting.stripe_secret_key).to eq('sk_test_123')
      expect(setting.stripe_webhook_secret).to eq('whsec_123')
      expect(setting.enabled?).to eq(true)

      # Subsequent calls should not overwrite stored keys.
      ENV['STRIPE_PUBLISHABLE_KEY'] = 'pk_test_other'
      setting2 = described_class.instance_for(studio)
      expect(setting2.id).to eq(setting.id)
      expect(setting2.stripe_publishable_key).to eq('pk_test_123')
    end
  end

  describe '#configured?' do
    it 'is true only when keys exist and enabled' do
      studio = create(:studio)
      setting = described_class.create!(
        studio: studio,
        default_currency: 'cad',
        enabled: true,
        stripe_publishable_key: 'pk_test_1',
        stripe_secret_key: 'sk_test_1'
      )

      expect(setting.configured?).to eq(true)

      setting.update!(enabled: false)
      expect(setting.configured?).to eq(false)

      setting.update!(enabled: true, stripe_secret_key: nil)
      expect(setting.configured?).to eq(false)
    end
  end
end
