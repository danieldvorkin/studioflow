require "rails_helper"

RSpec.describe ClientMembership, type: :model do
  subject(:membership) { build(:client_membership) }

  # ─── Validations ──────────────────────────────────────────────────────────────

  describe "validations" do
    it "is valid with valid attributes" do
      expect(membership).to be_valid
    end

    it "requires a client" do
      membership.client = nil
      expect(membership).not_to be_valid
    end

    it "requires a membership_plan" do
      membership.membership_plan = nil
      expect(membership).not_to be_valid
    end

    it "requires started_at" do
      membership.started_at = nil
      expect(membership).not_to be_valid
      expect(membership.errors[:started_at]).to be_present
    end

    it "rejects an invalid status" do
      membership.status = "unknown_status"
      expect(membership).not_to be_valid
      expect(membership.errors[:status]).to be_present
    end

    it "accepts all valid statuses" do
      %w[active paused cancelled expired].each do |s|
        membership.status = s
        expect(membership).to be_valid, "expected valid for status=#{s}"
      end
    end
  end

  # ─── Callbacks ────────────────────────────────────────────────────────────────

  describe "before_validation :set_studio_from_plan" do
    it "inherits studio_id from membership_plan on create" do
      studio = create(:studio)
      plan   = create(:membership_plan, studio: studio)
      client = create(:client, studio: studio)

      m = build(:client_membership, studio: nil, client: client, membership_plan: plan)
      expect(m).to be_valid
      expect(m.studio_id).to eq(studio.id)
    end
  end

  # ─── Scopes ───────────────────────────────────────────────────────────────────

  describe "scopes" do
    let(:studio) { create(:studio) }
    let(:plan)   { create(:membership_plan, studio: studio) }
    let(:client) { create(:client, studio: studio) }

    before do
      create(:client_membership, :active,    client: client, membership_plan: plan, studio: studio)
      create(:client_membership, :paused,    client: client, membership_plan: plan, studio: studio)
      create(:client_membership, :cancelled, client: client, membership_plan: plan, studio: studio)
    end

    it ".active returns only active memberships" do
      expect(ClientMembership.active.count).to eq(1)
    end

    it ".for_studio scopes to a studio" do
      other_studio = create(:studio)
      other_plan   = create(:membership_plan, studio: other_studio)
      other_client = create(:client, studio: other_studio)
      create(:client_membership, client: other_client, membership_plan: other_plan, studio: other_studio)

      expect(ClientMembership.for_studio(studio.id).count).to eq(3)
    end
  end

  # ─── Instance methods ─────────────────────────────────────────────────────────

  describe "#active?" do
    it "returns true for active status" do
      expect(build(:client_membership, :active)).to be_active
    end

    %w[paused cancelled expired].each do |s|
      it "returns false for #{s}" do
        expect(build(:client_membership, status: s)).not_to be_active
      end
    end
  end

  describe "#cancel!" do
    it "sets status to cancelled and records cancelled_at" do
      m = create(:client_membership, :active)
      expect { m.cancel! }.to change { m.status }.to("cancelled")
      expect(m.cancelled_at).not_to be_nil
    end

    it "sets notes when provided" do
      m = create(:client_membership, :active)
      m.cancel!(notes: "Client requested cancellation")
      expect(m.notes).to eq("Client requested cancellation")
    end
  end

  describe "#pause!" do
    it "changes status to paused" do
      m = create(:client_membership, :active)
      expect { m.pause! }.to change { m.status }.to("paused")
    end
  end

  describe "#reactivate!" do
    it "changes status to active and clears cancelled_at" do
      m = create(:client_membership, :cancelled)
      expect { m.reactivate! }.to change { m.status }.to("active")
      expect(m.cancelled_at).to be_nil
    end
  end
end
