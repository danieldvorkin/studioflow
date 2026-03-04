require 'rails_helper'

RSpec.describe InstructorPayoutPolicy do
  let(:record) { InstructorPayout.new }

  it 'allows owners and moderators' do
    owner = create(:user, :owner)
    moderator = create(:user, :moderator)
    staff = create(:user, :staff)
    instructor = create(:user, :instructor)

    [ :index?, :show?, :create?, :update? ].each do |action|
      expect(described_class.new(owner, record).public_send(action)).to eq(true)
      expect(described_class.new(moderator, record).public_send(action)).to eq(true)
      expect(described_class.new(staff, record).public_send(action)).to eq(false)
      expect(described_class.new(instructor, record).public_send(action)).to eq(false)
    end
  end

  it 'denies nil user' do
    expect(described_class.new(nil, record).index?).to be_falsey
    expect(described_class.new(nil, record).create?).to be_falsey
  end
end
