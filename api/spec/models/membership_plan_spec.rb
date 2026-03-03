require "rails_helper"

RSpec.describe MembershipPlan, type: :model do
  subject(:plan) { build(:membership_plan) }

  # ─── Validations ──────────────────────────────────────────────────────────────

  describe "validations" do
    it "is valid with valid attributes" do
      expect(plan).to be_valid
    end

    it "requires a name" do
      plan.name = ""
      expect(plan).not_to be_valid
      expect(plan.errors[:name]).to be_present
    end

    it "requires a studio" do
      plan.studio = nil
      expect(plan).not_to be_valid
    end

    it "requires price_cents to be non-negative" do
      plan.price_cents = -1
      expect(plan).not_to be_valid
      expect(plan.errors[:price_cents]).to be_present
    end

    it "allows price_cents of 0" do
      plan.price_cents = 0
      expect(plan).to be_valid
    end

    it "rejects invalid currency" do
      plan.currency = "eur"
      expect(plan).not_to be_valid
      expect(plan.errors[:currency]).to be_present
    end

    it "accepts cad and usd" do
      %w[cad usd].each do |c|
        plan.currency = c
        expect(plan).to be_valid
      end
    end

    it "requires min_commitment_months greater than 0" do
      plan.min_commitment_months = 0
      expect(plan).not_to be_valid
    end

    it "rejects private_session_discount_percent above 100" do
      plan.private_session_discount_percent = 101
      expect(plan).not_to be_valid
    end

    it "accepts private_session_discount_percent of 0–100" do
      [0, 10, 100].each do |pct|
        plan.private_session_discount_percent = pct
        expect(plan).to be_valid
      end
    end

    it "allows reformer_classes_per_month to be nil (unlimited)" do
      plan.reformer_classes_per_month = nil
      expect(plan).to be_valid
    end
  end

  # ─── Scopes ───────────────────────────────────────────────────────────────────

  describe "scopes" do
    let(:studio) { create(:studio) }

    before do
      create(:membership_plan, :published, studio: studio, position: 2, name: "Beta")
      create(:membership_plan, studio: studio,             position: 0, name: "Alpha")
      create(:membership_plan, :published, studio: studio, position: 1, name: "Gamma")
    end

    describe ".published" do
      it "returns only active plans" do
        expect(MembershipPlan.published.count).to eq(2)
        expect(MembershipPlan.published.map(&:active)).to all(eq(true))
      end
    end

    describe ".ordered" do
      it "orders by position then name" do
        names = MembershipPlan.where(studio: studio).ordered.map(&:name)
        expect(names).to eq(%w[Alpha Gamma Beta])
      end
    end
  end

  # ─── Helper methods ───────────────────────────────────────────────────────────

  describe "#price_dollars" do
    it "converts cents to dollars" do
      plan.price_cents = 13_900
      expect(plan.price_dollars).to eq(139.0)
    end
  end

  describe "#reformer_label" do
    it "returns 'Unlimited' when nil" do
      plan.reformer_classes_per_month = nil
      expect(plan.reformer_label).to eq("Unlimited")
    end

    it "returns the count as string when set" do
      plan.reformer_classes_per_month = 8
      expect(plan.reformer_label).to eq("8")
    end
  end

  describe "#mat_label" do
    it "returns 'Unlimited' when nil" do
      plan.mat_classes_per_month = nil
      expect(plan.mat_label).to eq("Unlimited")
    end

    it "returns the count as string when set" do
      plan.mat_classes_per_month = 1
      expect(plan.mat_label).to eq("1")
    end
  end

  # ─── Built-in plan tiers ─────────────────────────────────────────────────────

  describe "built-in plan traits" do
    it "essential plan has 4 reformer classes at $139" do
      p = build(:membership_plan, :essential)
      expect(p.reformer_classes_per_month).to eq(4)
      expect(p.price_cents).to eq(13_900)
    end

    it "unlimited plan has unlimited classes and guest passes" do
      p = build(:membership_plan, :unlimited)
      expect(p.reformer_classes_per_month).to be_nil
      expect(p.guest_passes_per_month).to eq(1)
      expect(p.includes_retail_discount).to eq(true)
    end
  end
end
