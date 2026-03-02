require 'rails_helper'

RSpec.describe ClassTemplatePolicy do
  let(:template_instructor) { create(:user, :instructor) }
  let(:template) { create(:class_template, instructor: template_instructor) }

  it 'allows owner/staff/instructor to create' do
    expect(described_class.new(create(:user, :owner), template).create?).to eq(true)
    expect(described_class.new(create(:user, :staff), template).create?).to eq(true)
    expect(described_class.new(create(:user, :instructor), template).create?).to eq(true)
  end

  it 'allows instructor to update only their own templates' do
    other_instructor = create(:user, :instructor)
    expect(described_class.new(template_instructor, template).update?).to eq(true)
    expect(described_class.new(other_instructor, template).update?).to eq(false)
  end

  it 'allows only owner/staff to destroy' do
    expect(described_class.new(create(:user, :owner), template).destroy?).to eq(true)
    expect(described_class.new(create(:user, :staff), template).destroy?).to eq(true)
    expect(described_class.new(template_instructor, template).destroy?).to eq(false)
  end
end
