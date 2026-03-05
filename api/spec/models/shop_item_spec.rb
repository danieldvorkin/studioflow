require "rails_helper"

RSpec.describe ShopItem, type: :model do
  let(:studio) { create(:studio) }

  subject(:item) { build(:shop_item, studio: studio) }

  describe "validations" do
    it "is valid with valid attributes" do
      expect(item).to be_valid
    end

    it "requires a title" do
      item.title = ""
      expect(item).not_to be_valid
      expect(item.errors[:title]).to include("can't be blank")
    end

    it "requires price_cents to be >= 0" do
      item.price_cents = -1
      expect(item).not_to be_valid
    end

    it "allows price_cents of 0 (free item)" do
      item.price_cents = 0
      expect(item).to be_valid
    end

    it "only allows supported currencies" do
      item.currency = "eur"
      expect(item).not_to be_valid
    end

    it "only allows valid item_type values" do
      item.item_type = "lease"
      expect(item).not_to be_valid
    end

    it "validates stock_quantity is non-negative when present" do
      item.stock_quantity = -5
      expect(item).not_to be_valid
    end

    it "allows nil stock_quantity (unlimited)" do
      item.stock_quantity = nil
      expect(item).to be_valid
    end
  end

  describe "#in_stock?" do
    it "returns true when stock_quantity is nil (unlimited)" do
      item.stock_quantity = nil
      expect(item.in_stock?).to be true
    end

    it "returns true when stock_quantity > 0" do
      item.stock_quantity = 5
      expect(item.in_stock?).to be true
    end

    it "returns false when stock_quantity is 0" do
      item.stock_quantity = 0
      expect(item.in_stock?).to be false
    end
  end

  describe "#rental? / #sale?" do
    it "returns true for rental item_type" do
      item.item_type = "rental"
      expect(item.rental?).to be true
      expect(item.sale?).to be false
    end

    it "returns true for sale item_type" do
      item.item_type = "sale"
      expect(item.sale?).to be true
      expect(item.rental?).to be false
    end
  end
end
