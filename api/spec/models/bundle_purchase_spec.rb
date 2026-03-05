require "rails_helper"

RSpec.describe BundlePurchase, type: :model do
  let(:studio) { create(:studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:template) { create(:class_template, instructor: instructor, currency: "cad") }
  let(:client) { create(:client, studio: studio) }
  let(:bundle_product) do
    BundleProduct.create!(
      studio: studio,
      title: "10-Class Pack",
      currency: "cad",
      credits_count: 10,
      price_cents: 1_000,
      class_template: template,
      active: true
    )
  end

  def build_purchase(**attrs)
    BundlePurchase.new(
      {
        studio: studio,
        client: client,
        bundle_product: bundle_product,
        status: "succeeded",
        credits_total: 10,
        credits_remaining: 10,
        price_cents: 1_000,
        unit_price_cents: 100,
        remainder_cents: 0,
        currency: "cad"
      }.merge(attrs)
    )
  end

  def create_purchase(**attrs)
    build_purchase(**attrs).tap(&:save!)
  end

  describe "validations" do
    it "is valid with all required attributes" do
      expect(build_purchase).to be_valid
    end

    it "rejects credits_total <= 0" do
      bp = build_purchase(credits_total: 0)
      expect(bp).not_to be_valid
    end

    it "rejects credits_remaining < 0" do
      bp = build_purchase(credits_remaining: -1)
      expect(bp).not_to be_valid
    end

    it "rejects currency outside cad/usd" do
      bp = build_purchase(currency: "gbp")
      expect(bp).not_to be_valid
    end
  end

  describe "#redeemable_for?" do
    let(:session) do
      create(:class_session, class_template: template, instructor: instructor,
             bundle_enabled: true, bundle_spots: 5, capacity: 10)
    end

    it "returns true when all conditions are met" do
      purchase = create_purchase
      expect(purchase.redeemable_for?(session)).to be true
    end

    it "returns false when status is failed" do
      purchase = create_purchase(status: "failed")
      expect(purchase.redeemable_for?(session)).to be false
    end

    it "returns false when credits_remaining is 0" do
      purchase = create_purchase(credits_remaining: 0)
      expect(purchase.redeemable_for?(session)).to be false
    end

    it "returns false when session bundle is not enabled" do
      no_bundle_session = create(:class_session, class_template: template, instructor: instructor)
      purchase = create_purchase
      expect(purchase.redeemable_for?(no_bundle_session)).to be false
    end

    it "returns false when currency does not match session template" do
      usd_template = create(:class_template, instructor: instructor, currency: "usd")
      usd_session = create(:class_session, class_template: usd_template, instructor: instructor,
                           bundle_enabled: true, bundle_spots: 5, capacity: 10,
                           start_time: 5.days.from_now.change(sec: 0), room: "Room USD")
      purchase = create_purchase # currency: cad
      expect(purchase.redeemable_for?(usd_session)).to be false
    end

    it "returns false when class_template does not match product's template restriction" do
      other_template = create(:class_template, instructor: instructor, currency: "cad",
                              capacity: 5, title: "Other Class")
      other_session = create(:class_session, class_template: other_template, instructor: instructor,
                             bundle_enabled: true, bundle_spots: 5, capacity: 10,
                             start_time: 6.days.from_now.change(sec: 0), room: "Room B")
      purchase = create_purchase # bundle_product is linked to `template`
      expect(purchase.redeemable_for?(other_session)).to be false
    end
  end

  describe "#redeem_one_credit!" do
    let(:session) do
      create(:class_session, class_template: template, instructor: instructor,
             bundle_enabled: true, bundle_spots: 5, capacity: 10)
    end

    it "decrements credits_remaining by 1" do
      purchase = create_purchase(credits_remaining: 3)
      purchase.redeem_one_credit!(class_session: session)
      expect(purchase.reload.credits_remaining).to eq(2)
    end

    it "returns the unit_price_cents" do
      purchase = create_purchase(credits_remaining: 3, unit_price_cents: 100, remainder_cents: 0)
      amount = purchase.redeem_one_credit!(class_session: session)
      expect(amount).to eq(100)
    end

    it "distributes remainder cents in first redemption" do
      purchase = create_purchase(credits_remaining: 3, unit_price_cents: 100, remainder_cents: 2)
      amount = purchase.redeem_one_credit!(class_session: session)
      expect(amount).to eq(101) # 100 + 1 remainder
      expect(purchase.reload.remainder_cents).to eq(1)
    end

    it "raises when not redeemable" do
      purchase = create_purchase(credits_remaining: 0)
      expect {
        purchase.redeem_one_credit!(class_session: session)
      }.to raise_error(ActiveRecord::RecordInvalid)
    end
  end
end
