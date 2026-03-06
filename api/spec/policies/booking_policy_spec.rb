require 'rails_helper'

RSpec.describe BookingPolicy do
  let(:studio) { create(:studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:template) { create(:class_template, instructor: instructor, studio: studio) }
  let(:session) { create(:class_session, class_template: template, studio: studio, instructor: instructor) }
  let(:client) { create(:client, studio: studio) }
  let(:booking) { create(:booking, client: client, class_session: session, studio: studio) }

  describe 'create?' do
    it 'allows owner, staff, moderator, instructor, client, and godmode' do
      expect(described_class.new(create(:user, :owner, studio: studio), booking).create?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), booking).create?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), booking).create?).to eq(true)
      expect(described_class.new(create(:user, :instructor, studio: studio), booking).create?).to eq(true)
      expect(described_class.new(create(:user, :client, studio: studio), booking).create?).to eq(true)
    end

    it 'denies nil user' do
      expect(described_class.new(nil, booking).create?).to be_falsey
    end
  end

  describe 'cancel?' do
    it 'allows owner, staff, and moderator unconditionally' do
      expect(described_class.new(create(:user, :owner, studio: studio), booking).cancel?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), booking).cancel?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), booking).cancel?).to eq(true)
    end

    it 'allows the booking client to cancel their own booking' do
      client_user = create(:user, :client, studio: studio)
      client.update!(user_id: client_user.id)
      expect(described_class.new(client_user, booking).cancel?).to eq(true)
    end

    it 'denies a different client from cancelling' do
      other_client = create(:user, :client, studio: studio)
      expect(described_class.new(other_client, booking).cancel?).to eq(false)
    end

    it 'allows the session instructor to cancel' do
      expect(described_class.new(instructor, booking).cancel?).to eq(true)
    end

    it 'denies a different instructor' do
      other_instructor = create(:user, :instructor, studio: studio)
      expect(described_class.new(other_instructor, booking).cancel?).to eq(false)
    end
  end

  describe 'archive?' do
    it 'allows owner, staff, and moderator' do
      expect(described_class.new(create(:user, :owner, studio: studio), booking).archive?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), booking).archive?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), booking).archive?).to eq(true)
    end

    it 'allows the session instructor to archive' do
      expect(described_class.new(instructor, booking).archive?).to eq(true)
    end

    it 'denies a different instructor' do
      other_instructor = create(:user, :instructor, studio: studio)
      expect(described_class.new(other_instructor, booking).archive?).to eq(false)
    end

    it 'denies clients from archiving' do
      client_user = create(:user, :client, studio: studio)
      expect(described_class.new(client_user, booking).archive?).to eq(false)
    end
  end

  describe 'rebook?' do
    it 'delegates to cancel? — allows owner, staff, moderator' do
      expect(described_class.new(create(:user, :owner, studio: studio), booking).rebook?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), booking).rebook?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), booking).rebook?).to eq(true)
    end
  end
end
