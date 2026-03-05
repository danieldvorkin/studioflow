require "rails_helper"

RSpec.describe BundleProduct, type: :model do
  let(:studio) { create(:studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:template) { create(:class_template, instructor: instructor) }

  def valid_attrs
    {
      studio: studio,
      title: "10-Class Pack",
      currency: "cad",
      credits_count: 10,
      price_cents: 1000,
      class_template: template
    }
  end

  describe "validations" do
    it "is valid with all required attributes" do
      expect(BundleProduct.new(valid_attrs)).to be_valid
    end

    it "requires a title" do
      bp = BundleProduct.new(valid_attrs.merge(title: nil))
      expect(bp).not_to be_valid
      expect(bp.errors[:title]).to be_present
    end

    it "requires currency to be cad or usd" do
      bp = BundleProduct.new(valid_attrs.merge(currency: "eur"))
      expect(bp).not_to be_valid
      expect(bp.errors[:currency]).to be_present
    end

    it "requires credits_count > 0" do
      bp = BundleProduct.new(valid_attrs.merge(credits_count: 0))
      expect(bp).not_to be_valid
      expect(bp.errors[:credits_count]).to be_present
    end

    it "requires price_cents >= 0" do
      bp = BundleProduct.new(valid_attrs.merge(price_cents: -1))
      expect(bp).not_to be_valid
      expect(bp.errors[:price_cents]).to be_present
    end

    it "requires class_template or instructor" do
      bp = BundleProduct.new(valid_attrs.merge(class_template: nil, instructor: nil))
      expect(bp).not_to be_valid
      expect(bp.errors[:base].join).to match(/linked to a class or an instructor/i)
    end

    it "rejects class_template from a different studio" do
      other_studio = create(:studio)
      other_instructor = create(:user, :instructor, studio: other_studio)
      other_template = create(:class_template, instructor: other_instructor)
      bp = BundleProduct.new(valid_attrs.merge(class_template: other_template))
      expect(bp).not_to be_valid
      expect(bp.errors[:class_template]).to be_present
    end
  end

  describe "#unit_price_cents" do
    it "divides price_cents by credits_count" do
      bp = BundleProduct.new(valid_attrs.merge(price_cents: 1000, credits_count: 10))
      expect(bp.unit_price_cents).to eq(100)
    end

    it "returns 0 when credits_count is 0" do
      bp = BundleProduct.new(valid_attrs.merge(credits_count: 1)) # valid
      bp.credits_count = 0
      expect(bp.unit_price_cents).to eq(0)
    end
  end

  describe "#remainder_cents" do
    it "returns the remainder when price does not divide evenly" do
      bp = BundleProduct.new(valid_attrs.merge(price_cents: 1001, credits_count: 10))
      expect(bp.remainder_cents).to eq(1)
    end

    it "returns 0 for even division" do
      bp = BundleProduct.new(valid_attrs.merge(price_cents: 1000, credits_count: 10))
      expect(bp.remainder_cents).to eq(0)
    end
  end
end