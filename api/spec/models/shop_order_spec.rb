require "rails_helper"

RSpec.describe ShopOrder, type: :model do
  let(:studio)    { create(:studio) }
  let(:shop_item) { create(:shop_item, studio: studio, price_cents: 1500) }
  let(:client)    { create(:client, studio: studio) }

  subject(:order) { build(:shop_order, studio: studio, shop_item: shop_item, client: client, total_cents: 1500) }

  describe "validations" do
    it "is valid with valid attributes" do
      expect(order).to be_valid
    end

    it "requires quantity > 0" do
      order.quantity = 0
      expect(order).not_to be_valid
    end

    it "requires a valid status" do
      order.status = "unknown"
      expect(order).not_to be_valid
    end

    it "allows all valid statuses" do
      %w[pending paid cancelled returned].each do |s|
        order.status = s
        expect(order).to be_valid, "expected #{s} to be valid"
      end
    end

    it "requires currency from allowed list" do
      order.currency = "eur"
      expect(order).not_to be_valid
    end
  end

  describe "before_validation :infer_studio" do
    it "infers studio from shop_item when studio_id is blank" do
      order.studio_id = nil
      order.valid?
      expect(order.studio_id).to eq(studio.id)
    end
  end
end
