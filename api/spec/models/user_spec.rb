require 'rails_helper'

RSpec.describe User, type: :model do
  let(:studio) { create(:studio) }

  describe 'ROLES constant' do
    it 'includes all expected roles' do
      expect(User::ROLES).to include(owner: 0, staff: 1, instructor: 2, client: 3, moderator: 4)
    end
  end

  describe '#moderator?' do
    it 'returns true for a user with role moderator' do
      user = build(:user, :moderator, studio: studio)
      expect(user.moderator?).to eq(true)
    end

    it 'returns false for an owner' do
      user = build(:user, :owner, studio: studio)
      expect(user.moderator?).to eq(false)
    end

    it 'returns false for a client' do
      user = build(:user, :client, studio: studio)
      expect(user.moderator?).to eq(false)
    end
  end

  describe '#platform_staff?' do
    it 'returns true for a moderator' do
      user = build(:user, :moderator, studio: studio)
      expect(user.platform_staff?).to eq(true)
    end

    it 'returns true for the godmode email' do
      user = build(:user, email: 'dvorkin212@gmail.com', studio: studio)
      expect(user.platform_staff?).to eq(true)
    end

    it 'returns false for a regular owner' do
      user = build(:user, :owner, studio: studio)
      expect(user.platform_staff?).to eq(false)
    end
  end

  describe '#role_name' do
    it 'returns "moderator" for a moderator role user' do
      user = build(:user, :moderator, studio: studio)
      expect(user.role_name).to eq('moderator')
    end

    it 'returns "godmode" for the godmode email regardless of role' do
      user = build(:user, email: 'dvorkin212@gmail.com', studio: studio)
      expect(user.role_name).to eq('godmode')
    end
  end
end
