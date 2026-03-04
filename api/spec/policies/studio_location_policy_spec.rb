require 'rails_helper'

RSpec.describe StudioLocationPolicy do
  let(:studio) { create(:studio) }
  let(:location) { create(:studio_location, studio: studio) }

  describe 'index?' do
    it 'allows owner, staff, and moderator' do
      expect(described_class.new(create(:user, :owner, studio: studio), location).index?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), location).index?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), location).index?).to eq(true)
    end

    it 'denies instructor and client' do
      expect(described_class.new(create(:user, :instructor, studio: studio), location).index?).to eq(false)
      expect(described_class.new(create(:user, :client, studio: studio), location).index?).to eq(false)
    end
  end

  describe 'create? / update? / destroy?' do
    it 'allows owner and moderator' do
      [ :create?, :update?, :destroy? ].each do |action|
        expect(described_class.new(create(:user, :owner, studio: studio), location).public_send(action)).to eq(true)
        expect(described_class.new(create(:user, :moderator, studio: studio), location).public_send(action)).to eq(true)
      end
    end

    it 'denies staff, instructor, and client' do
      [ :create?, :update?, :destroy? ].each do |action|
        expect(described_class.new(create(:user, :staff, studio: studio), location).public_send(action)).to eq(false)
        expect(described_class.new(create(:user, :instructor, studio: studio), location).public_send(action)).to eq(false)
        expect(described_class.new(create(:user, :client, studio: studio), location).public_send(action)).to eq(false)
      end
    end

    it 'denies nil user' do
      expect(described_class.new(nil, location).create?).to be_falsey
    end
  end
end
