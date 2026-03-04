require 'rails_helper'

RSpec.describe UserPolicy do
  let(:record) { User.new }

  describe 'invite?' do
    it 'allows owner, staff, and moderator' do
      expect(described_class.new(create(:user, :owner), record).invite?).to eq(true)
      expect(described_class.new(create(:user, :staff), record).invite?).to eq(true)
      expect(described_class.new(create(:user, :moderator), record).invite?).to eq(true)
    end

    it 'denies instructor and client' do
      expect(described_class.new(create(:user, :instructor), record).invite?).to eq(false)
      expect(described_class.new(create(:user, :client), record).invite?).to eq(false)
    end

    it 'denies nil user' do
      expect(described_class.new(nil, record).invite?).to be_falsey
    end
  end

  describe 'create_moderator?' do
    it 'allows owner' do
      expect(described_class.new(create(:user, :owner), record).create_moderator?).to eq(true)
    end

    it 'denies staff, instructor, client, and moderator' do
      expect(described_class.new(create(:user, :staff), record).create_moderator?).to eq(false)
      expect(described_class.new(create(:user, :instructor), record).create_moderator?).to eq(false)
      expect(described_class.new(create(:user, :client), record).create_moderator?).to eq(false)
      expect(described_class.new(create(:user, :moderator), record).create_moderator?).to eq(false)
    end
  end

  describe 'update?' do
    it 'allows owner and moderator' do
      expect(described_class.new(create(:user, :owner), record).update?).to eq(true)
      expect(described_class.new(create(:user, :moderator), record).update?).to eq(true)
    end

    it 'denies staff, instructor, and client' do
      expect(described_class.new(create(:user, :staff), record).update?).to eq(false)
      expect(described_class.new(create(:user, :instructor), record).update?).to eq(false)
      expect(described_class.new(create(:user, :client), record).update?).to eq(false)
    end
  end
end
