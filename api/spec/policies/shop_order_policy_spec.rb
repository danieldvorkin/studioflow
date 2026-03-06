require 'rails_helper'

RSpec.describe ShopOrderPolicy do
  let(:studio) { create(:studio) }
  let(:item) { create(:shop_item, studio: studio) }
  let(:client) { create(:client, studio: studio) }
  let(:order) { create(:shop_order, studio: studio, shop_item: item, client: client) }

  describe 'index? / update? / destroy? (admin management)' do
    it 'allows owner, staff, and moderator' do
      owner     = create(:user, :owner, studio: studio)
      staff     = create(:user, :staff, studio: studio)
      moderator = create(:user, :moderator, studio: studio)

      [ :index?, :update?, :destroy? ].each do |action|
        expect(described_class.new(owner, order).public_send(action)).to eq(true)
        expect(described_class.new(staff, order).public_send(action)).to eq(true)
        expect(described_class.new(moderator, order).public_send(action)).to eq(true)
      end
    end

    it 'denies instructor and client' do
      instructor = create(:user, :instructor, studio: studio)
      client_user = create(:user, :client, studio: studio)

      [ :index?, :update?, :destroy? ].each do |action|
        expect(described_class.new(instructor, order).public_send(action)).to eq(false)
        expect(described_class.new(client_user, order).public_send(action)).to eq(false)
      end
    end

    it 'denies nil user' do
      expect(described_class.new(nil, order).index?).to be_falsey
    end
  end

  describe 'mine? (view own orders)' do
    it 'allows any authenticated user' do
      expect(described_class.new(create(:user, :client, studio: studio), order).mine?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), order).mine?).to eq(true)
    end

    it 'denies nil user' do
      expect(described_class.new(nil, order).mine?).to be_falsey
    end
  end

  describe 'create?' do
    it 'allows any authenticated user to place orders' do
      expect(described_class.new(create(:user, :client, studio: studio), order).create?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), order).create?).to eq(true)
    end

    it 'denies nil user' do
      expect(described_class.new(nil, order).create?).to be_falsey
    end
  end
end
