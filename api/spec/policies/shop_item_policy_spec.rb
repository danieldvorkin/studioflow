require 'rails_helper'

RSpec.describe ShopItemPolicy do
  let(:studio) { create(:studio) }
  let(:item) { create(:shop_item, studio: studio) }

  describe 'management actions (index? / create? / update? / destroy?)' do
    it 'allows owner, staff, and moderator' do
      owner     = create(:user, :owner, studio: studio)
      staff     = create(:user, :staff, studio: studio)
      moderator = create(:user, :moderator, studio: studio)

      [ :index?, :create?, :update?, :destroy? ].each do |action|
        expect(described_class.new(owner, item).public_send(action)).to eq(true)
        expect(described_class.new(staff, item).public_send(action)).to eq(true)
        expect(described_class.new(moderator, item).public_send(action)).to eq(true)
      end
    end

    it 'denies instructor and client from management actions' do
      instructor = create(:user, :instructor, studio: studio)
      client     = create(:user, :client, studio: studio)

      [ :index?, :create?, :update?, :destroy? ].each do |action|
        expect(described_class.new(instructor, item).public_send(action)).to eq(false)
        expect(described_class.new(client, item).public_send(action)).to eq(false)
      end
    end

    it 'denies nil user from management actions' do
      expect(described_class.new(nil, item).index?).to be_falsey
      expect(described_class.new(nil, item).create?).to be_falsey
    end
  end

  describe 'show?' do
    it 'allows any authenticated user to browse the shop' do
      expect(described_class.new(create(:user, :owner, studio: studio), item).show?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), item).show?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), item).show?).to eq(true)
      expect(described_class.new(create(:user, :instructor, studio: studio), item).show?).to eq(true)
      expect(described_class.new(create(:user, :client, studio: studio), item).show?).to eq(true)
    end

    it 'denies nil user from browsing' do
      expect(described_class.new(nil, item).show?).to be_falsey
    end
  end
end
