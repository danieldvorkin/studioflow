require "rails_helper"

RSpec.describe ClientMembershipPolicy do
  let(:studio)     { create(:studio) }
  let(:plan)       { create(:membership_plan, studio: studio) }
  let(:client)     { create(:client, studio: studio) }
  let(:membership) { create(:client_membership, client: client, membership_plan: plan, studio: studio) }

  shared_examples "can manage" do |role|
    let(:user) { create(:user, role, studio: studio) }

    it "allows index?" do
      expect(described_class.new(user, membership).index?).to eq(true)
    end

    it "allows create?" do
      expect(described_class.new(user, membership).create?).to eq(true)
    end

    it "allows update?" do
      expect(described_class.new(user, membership).update?).to eq(true)
    end
  end

  describe "owner" do
    include_examples "can manage", :owner
  end

  describe "staff" do
    include_examples "can manage", :staff
  end

  describe "moderator" do
    include_examples "can manage", :moderator
  end

  describe "client" do
    let(:client_user) { create(:user, :client, studio: studio) }

    it "allows index? (view own memberships)" do
      expect(described_class.new(client_user, membership).index?).to eq(true)
    end

    it "denies create?" do
      expect(described_class.new(client_user, membership).create?).to eq(false)
    end

    it "denies update?" do
      expect(described_class.new(client_user, membership).update?).to eq(false)
    end
  end
end
