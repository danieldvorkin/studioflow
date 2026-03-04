require 'rails_helper'

RSpec.describe PaymentSettingPolicy do
  let(:record) { PaymentSetting.new }

  describe 'show? / update?' do
    it 'allows owner and moderator' do
      expect(described_class.new(create(:user, :owner), record).show?).to eq(true)
      expect(described_class.new(create(:user, :owner), record).update?).to eq(true)
      expect(described_class.new(create(:user, :moderator), record).show?).to eq(true)
      expect(described_class.new(create(:user, :moderator), record).update?).to eq(true)
    end

    it 'denies staff, instructor, and client' do
      expect(described_class.new(create(:user, :staff), record).show?).to eq(false)
      expect(described_class.new(create(:user, :staff), record).update?).to eq(false)
      expect(described_class.new(create(:user, :instructor), record).show?).to eq(false)
      expect(described_class.new(create(:user, :instructor), record).update?).to eq(false)
      expect(described_class.new(create(:user, :client), record).show?).to eq(false)
      expect(described_class.new(create(:user, :client), record).update?).to eq(false)
    end

    it 'denies nil user' do
      expect(described_class.new(nil, record).show?).to be_falsey
      expect(described_class.new(nil, record).update?).to be_falsey
    end
  end
end
