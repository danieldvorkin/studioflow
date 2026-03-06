require 'rails_helper'

RSpec.describe BundlePurchasePolicy do
  let(:studio) { create(:studio) }
  let(:record) { BundlePurchase.new(studio: studio) }

  describe 'create?' do
    it 'allows owner, staff, moderator, and client' do
      expect(described_class.new(create(:user, :owner, studio: studio), record).create?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), record).create?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), record).create?).to eq(true)
      expect(described_class.new(create(:user, :client, studio: studio), record).create?).to eq(true)
    end

    it 'denies instructor' do
      expect(described_class.new(create(:user, :instructor, studio: studio), record).create?).to eq(false)
    end

    it 'denies nil user' do
      expect(described_class.new(nil, record).create?).to be_falsey
    end
  end

  describe 'index?' do
    it 'allows only clients to view their own purchases' do
      expect(described_class.new(create(:user, :client, studio: studio), record).index?).to eq(true)
    end

    it 'denies owner, staff, and moderator (they use admin resolvers instead)' do
      expect(described_class.new(create(:user, :owner, studio: studio), record).index?).to eq(false)
      expect(described_class.new(create(:user, :staff, studio: studio), record).index?).to eq(false)
      expect(described_class.new(create(:user, :moderator, studio: studio), record).index?).to eq(false)
    end

    it 'denies nil user' do
      expect(described_class.new(nil, record).index?).to be_falsey
    end
  end
end
