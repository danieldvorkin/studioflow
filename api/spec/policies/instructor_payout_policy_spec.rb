require 'rails_helper'

RSpec.describe InstructorPayoutPolicy do
  let(:record) { InstructorPayout.new }

  it 'allows only owners' do
    owner = create(:user, :owner)
    staff = create(:user, :staff)
    instructor = create(:user, :instructor)

    expect(described_class.new(owner, record).index?).to eq(true)
    expect(described_class.new(owner, record).show?).to eq(true)
    expect(described_class.new(owner, record).create?).to eq(true)
    expect(described_class.new(owner, record).update?).to eq(true)

    expect(described_class.new(staff, record).index?).to eq(false)
    expect(described_class.new(instructor, record).index?).to eq(false)
  end
end
