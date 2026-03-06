require 'rails_helper'

RSpec.describe BundleProductPolicy do
  let(:studio) { create(:studio) }
  let(:record) { BundleProduct.new(studio: studio) }

  describe 'index? / create? / update? / destroy?' do
    it 'allows owner, staff, and moderator' do
      owner     = create(:user, :owner, studio: studio)
      staff     = create(:user, :staff, studio: studio)
      moderator = create(:user, :moderator, studio: studio)

      [ :index?, :create?, :update?, :destroy? ].each do |action|
        expect(described_class.new(owner, record).public_send(action)).to eq(true)
        expect(described_class.new(staff, record).public_send(action)).to eq(true)
        expect(described_class.new(moderator, record).public_send(action)).to eq(true)
      end
    end

    it 'denies instructor and client' do
      instructor = create(:user, :instructor, studio: studio)
      client     = create(:user, :client, studio: studio)

      [ :index?, :create?, :update?, :destroy? ].each do |action|
        expect(described_class.new(instructor, record).public_send(action)).to eq(false)
        expect(described_class.new(client, record).public_send(action)).to eq(false)
      end
    end

    it 'denies nil user' do
      expect(described_class.new(nil, record).index?).to be_falsey
      expect(described_class.new(nil, record).create?).to be_falsey
    end
  end
end
