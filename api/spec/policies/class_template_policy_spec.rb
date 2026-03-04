require 'rails_helper'

RSpec.describe ClassTemplatePolicy do
  let(:template_instructor) { create(:user, :instructor) }
  let(:template) { create(:class_template, instructor: template_instructor) }

  it 'allows owner/staff/moderator to create' do
    expect(described_class.new(create(:user, :owner), template).create?).to eq(true)
    expect(described_class.new(create(:user, :staff), template).create?).to eq(true)
    expect(described_class.new(create(:user, :moderator), template).create?).to eq(true)
  end

  it 'denies instructor from creating templates' do
    expect(described_class.new(template_instructor, template).create?).to eq(false)
  end

  it 'allows owner/staff/moderator to update any template' do
    expect(described_class.new(create(:user, :owner), template).update?).to eq(true)
    expect(described_class.new(create(:user, :staff), template).update?).to eq(true)
    expect(described_class.new(create(:user, :moderator), template).update?).to eq(true)
  end

  it 'denies instructor from updating templates' do
    expect(described_class.new(template_instructor, template).update?).to eq(false)
  end

  it 'allows owner/staff/moderator to destroy' do
    expect(described_class.new(create(:user, :owner), template).destroy?).to eq(true)
    expect(described_class.new(create(:user, :staff), template).destroy?).to eq(true)
    expect(described_class.new(create(:user, :moderator), template).destroy?).to eq(true)
  end

  it 'denies instructor from destroying templates' do
    expect(described_class.new(template_instructor, template).destroy?).to eq(false)
  end

  it 'denies client from all actions' do
    client = create(:user, :client)
    expect(described_class.new(client, template).create?).to eq(false)
    expect(described_class.new(client, template).update?).to eq(false)
    expect(described_class.new(client, template).destroy?).to eq(false)
  end
end
