require "rails_helper"

RSpec.describe MembershipPlanPolicy do
  let(:studio) { create(:studio) }
  let(:plan)   { create(:membership_plan, studio: studio) }

  shared_examples "can manage" do |role|
    let(:user) { create(:user, role, studio: studio) }

    it "allows index?" do
      expect(described_class.new(user, plan).index?).to eq(true)
    end

    it "allows create?" do
      expect(described_class.new(user, plan).create?).to eq(true)
    end

    it "allows update?" do
      expect(described_class.new(user, plan).update?).to eq(true)
    end

    it "allows destroy?" do
      expect(described_class.new(user, plan).destroy?).to eq(true)
    end
  end

  describe "owner" do
    include_examples "can manage", :owner
  end

  describe "staff" do
    include_examples "can manage", :staff
  end

  describe "client" do
    let(:client_user) { create(:user, :client, studio: studio) }

    it "allows index? (read plans)" do
      expect(described_class.new(client_user, plan).index?).to eq(true)
    end

    it "denies create?" do
      expect(described_class.new(client_user, plan).create?).to eq(false)
    end

    it "denies update?" do
      expect(described_class.new(client_user, plan).update?).to eq(false)
    end

    it "denies destroy?" do
      expect(described_class.new(client_user, plan).destroy?).to eq(false)
    end
  end

  describe "instructor" do
    let(:instructor) { create(:user, :instructor, studio: studio) }

    it "denies create?" do
      expect(described_class.new(instructor, plan).create?).to eq(false)
    end
  end

  describe "nil user" do
    it "denies all actions" do
      expect(described_class.new(nil, plan).index?).to be_falsey
      expect(described_class.new(nil, plan).create?).to be_falsey
    end
  end
end
