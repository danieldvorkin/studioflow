require 'rails_helper'

RSpec.describe ClassSessionPolicy do
  let(:studio) { create(:studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:other_instructor) { create(:user, :instructor, studio: studio) }
  let(:template) { create(:class_template, instructor: instructor, studio: studio) }
  let(:session) { create(:class_session, class_template: template, studio: studio, instructor: instructor) }

  describe 'create?' do
    it 'allows owner, staff, moderator, and instructor' do
      expect(described_class.new(create(:user, :owner, studio: studio), session).create?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), session).create?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), session).create?).to eq(true)
      expect(described_class.new(instructor, session).create?).to eq(true)
    end

    it 'denies client' do
      expect(described_class.new(create(:user, :client, studio: studio), session).create?).to eq(false)
    end

    it 'denies nil user' do
      expect(described_class.new(nil, session).create?).to be_falsey
    end
  end

  describe 'update?' do
    it 'allows owner, staff, and moderator unconditionally' do
      expect(described_class.new(create(:user, :owner, studio: studio), session).update?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), session).update?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), session).update?).to eq(true)
    end

    it 'allows the session owner instructor to update' do
      expect(described_class.new(instructor, session).update?).to eq(true)
    end

    it 'denies a different instructor from updating' do
      expect(described_class.new(other_instructor, session).update?).to eq(false)
    end

    it 'denies client' do
      expect(described_class.new(create(:user, :client, studio: studio), session).update?).to eq(false)
    end
  end

  describe 'destroy?' do
    it 'allows owner, staff, and moderator' do
      expect(described_class.new(create(:user, :owner, studio: studio), session).destroy?).to eq(true)
      expect(described_class.new(create(:user, :staff, studio: studio), session).destroy?).to eq(true)
      expect(described_class.new(create(:user, :moderator, studio: studio), session).destroy?).to eq(true)
    end

    it 'denies instructor and client' do
      expect(described_class.new(instructor, session).destroy?).to eq(false)
      expect(described_class.new(create(:user, :client, studio: studio), session).destroy?).to eq(false)
    end

    it 'denies nil user' do
      expect(described_class.new(nil, session).destroy?).to be_falsey
    end
  end
end
