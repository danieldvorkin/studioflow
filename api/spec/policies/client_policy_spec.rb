require 'rails_helper'

RSpec.describe ClientPolicy do
  let(:studio) { create(:studio) }
  let(:client_record) { create(:client, studio: studio) }

  describe 'index?' do
    it 'allows owner, staff, and moderator' do
      expect(described_class.new(create(:user, :owner, studio: studio), client_record).index?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), client_record).index?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), client_record).index?).to eq(true)
    end

    it 'denies instructor and client' do
      expect(described_class.new(create(:user, :instructor, studio: studio), client_record).index?).to eq(false)
      expect(described_class.new(create(:user, :client, studio: studio), client_record).index?).to eq(false)
    end

    it 'denies nil user' do
      expect(described_class.new(nil, client_record).index?).to be_falsey
    end
  end

  describe 'show?' do
    it 'allows owner, staff, and moderator' do
      expect(described_class.new(create(:user, :owner, studio: studio), client_record).show?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), client_record).show?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), client_record).show?).to eq(true)
    end

    it 'denies instructor and client' do
      expect(described_class.new(create(:user, :instructor, studio: studio), client_record).show?).to eq(false)
      expect(described_class.new(create(:user, :client, studio: studio), client_record).show?).to eq(false)
    end
  end

  describe 'update?' do
    it 'allows owner, staff, and moderator' do
      expect(described_class.new(create(:user, :owner, studio: studio), client_record).update?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), client_record).update?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), client_record).update?).to eq(true)
    end

    it 'denies instructor and client' do
      expect(described_class.new(create(:user, :instructor, studio: studio), client_record).update?).to eq(false)
      expect(described_class.new(create(:user, :client, studio: studio), client_record).update?).to eq(false)
    end
  end

  describe 'destroy?' do
    it 'allows owner and moderator' do
      expect(described_class.new(create(:user, :owner, studio: studio), client_record).destroy?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), client_record).destroy?).to eq(true)
    end

    it 'denies staff, instructor, and client' do
      expect(described_class.new(create(:user, :staff, studio: studio), client_record).destroy?).to eq(false)
      expect(described_class.new(create(:user, :instructor, studio: studio), client_record).destroy?).to eq(false)
      expect(described_class.new(create(:user, :client, studio: studio), client_record).destroy?).to eq(false)
    end
  end
end
