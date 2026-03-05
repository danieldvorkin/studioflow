require "rails_helper"

RSpec.describe StudioSubscription, type: :model do
  subject(:sub) { build(:studio_subscription) }

  describe "validations" do
    it "belongs to a studio" do
      sub = build(:studio_subscription, studio: nil)
      expect(sub).not_to be_valid
    end

    it "rejects an invalid tier" do
      sub = build(:studio_subscription, tier: "enterprise")
      expect(sub).not_to be_valid
      expect(sub.errors[:tier]).to be_present
    end

    it "rejects an invalid status" do
      sub = build(:studio_subscription, status: "unknown")
      expect(sub).not_to be_valid
      expect(sub.errors[:status]).to be_present
    end

    it "enforces one subscription per studio" do
      existing = create(:studio_subscription)
      duplicate = build(:studio_subscription, studio: existing.studio)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:studio_id]).to be_present
    end
  end

  describe "constants" do
    it "has all expected tiers" do
      expect(described_class::TIERS).to contain_exactly("starter", "pro", "studio", "basic", "premium")
    end

    it "has all expected statuses" do
      expect(described_class::STATUSES).to include("trialing", "active", "past_due", "cancelled", "suspended")
    end

    it "has a USD monthly price for basic" do
      expect(described_class::TIER_PRICES.dig("basic", :price_usd_monthly)).to eq(59)
    end

    it "has a USD monthly price for premium" do
      expect(described_class::TIER_PRICES.dig("premium", :price_usd_monthly)).to eq(129)
    end
  end

  describe "#active?" do
    it "returns true for active status" do
      expect(build(:studio_subscription, status: "active")).to be_active
    end

    it "returns true for trialing status" do
      expect(build(:studio_subscription, status: "trialing")).to be_active
    end

    %w[past_due cancelled suspended].each do |s|
      it "returns false for #{s}" do
        expect(build(:studio_subscription, status: s)).not_to be_active
      end
    end
  end

  describe "#premium?" do
    it "returns true for premium tier" do
      expect(build(:studio_subscription, :premium)).to be_premium
    end

    it "returns false for basic tier" do
      expect(build(:studio_subscription, :basic)).not_to be_premium
    end
  end

  describe "#price_cad" do
    it "returns the CAD price for basic" do
      expect(build(:studio_subscription, :basic).price_cad).to eq(79)
    end

    it "returns the CAD price for premium" do
      expect(build(:studio_subscription, :premium).price_cad).to eq(175)
    end
  end

  describe "scopes" do
    it "active_or_trialing returns only active and trialing records" do
      create(:studio_subscription, :basic, status: "active")
      create(:studio_subscription, :premium, status: "trialing")
      create(:studio_subscription, :cancelled)
      create(:studio_subscription, :past_due)

      expect(described_class.active_or_trialing.count).to eq(2)
    end
  end
end
