require "rails_helper"

RSpec.describe "Shop GraphQL", type: :request do
  let(:studio) { create(:studio) }
  let(:owner)  { create(:user, :owner, studio: studio) }
  let(:client_user) { create(:user, :client, studio: studio) }

  # ── shop items query ─────────────────────────────────────────────────────────

  describe "shopItems query" do
    let(:query) do
      <<~GRAPHQL
        query {
          shopItems {
            id title priceCents currency itemType active inStock stockQuantity
          }
        }
      GRAPHQL
    end

    context "as owner" do
      it "returns all studio items including inactive" do
        active_item   = create(:shop_item, studio: studio, active: true)
        inactive_item = create(:shop_item, :inactive, studio: studio)

        sign_in(owner)
        json = graphql_post(query: query)

        expect(json["errors"]).to be_nil
        ids = json.dig("data", "shopItems").map { |i| i["id"].to_i }
        expect(ids).to include(active_item.id, inactive_item.id)
      end

      it "does not return items from another studio" do
        other_studio = create(:studio)
        other_item   = create(:shop_item, studio: other_studio)

        sign_in(owner)
        json = graphql_post(query: query)

        ids = json.dig("data", "shopItems").map { |i| i["id"].to_i }
        expect(ids).not_to include(other_item.id)
      end
    end

    context "as unauthenticated" do
      it "returns an error" do
        json = graphql_post(query: query)
        expect(json["errors"] || json.dig("data", "shopItems")).to satisfy { |v|
          v.is_a?(Array) && v.any? { |e| e.is_a?(Hash) } || v.nil?
        }
      end
    end
  end

  # ── createShopItem mutation ───────────────────────────────────────────────────

  describe "createShopItem mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation CreateShopItem($title: String!, $priceCents: Int!, $itemType: String, $currency: String) {
          createShopItem(input: {
            title: $title
            priceCents: $priceCents
            itemType: $itemType
            currency: $currency
          }) {
            shopItem { id title priceCents itemType currency active }
            errors
          }
        }
      GRAPHQL
    end

    context "as owner" do
      it "creates a sale item" do
        sign_in(owner)
        json = graphql_post(
          query: mutation,
          variables: { title: "Yoga Mat", priceCents: 3500, itemType: "sale", currency: "cad" }
        )

        payload = json.dig("data", "createShopItem")
        expect(payload["errors"]).to be_empty
        expect(payload.dig("shopItem", "title")).to eq("Yoga Mat")
        expect(payload.dig("shopItem", "priceCents")).to eq(3500)
        expect(payload.dig("shopItem", "itemType")).to eq("sale")
        expect(payload.dig("shopItem", "active")).to eq(true)
      end

      it "creates a rental item" do
        sign_in(owner)
        json = graphql_post(
          query: mutation,
          variables: { title: "Foam Roller", priceCents: 500, itemType: "rental", currency: "cad" }
        )

        payload = json.dig("data", "createShopItem")
        expect(payload["errors"]).to be_empty
        expect(payload.dig("shopItem", "itemType")).to eq("rental")
      end

      it "returns errors for invalid data" do
        sign_in(owner)
        json = graphql_post(
          query: mutation,
          variables: { title: "", priceCents: 0, itemType: "sale", currency: "cad" }
        )

        payload = json.dig("data", "createShopItem")
        expect(payload["errors"]).not_to be_empty
        expect(payload["shopItem"]).to be_nil
      end
    end

    context "as client" do
      it "is not authorized" do
        sign_in(client_user)
        json = graphql_post(
          query: mutation,
          variables: { title: "Yoga Mat", priceCents: 3500, itemType: "sale", currency: "cad" }
        )

        errors = json["errors"] || []
        data_errors = json.dig("data", "createShopItem", "errors") || []
        expect((errors + data_errors).any?).to be true
      end
    end
  end

  # ── updateShopItem mutation ───────────────────────────────────────────────────

  describe "updateShopItem mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation UpdateShopItem($id: ID!, $title: String, $active: Boolean) {
          updateShopItem(input: { id: $id, title: $title, active: $active }) {
            shopItem { id title active }
            errors
          }
        }
      GRAPHQL
    end

    it "updates the item" do
      item = create(:shop_item, studio: studio, title: "Old Title")
      sign_in(owner)
      json = graphql_post(
        query: mutation,
        variables: { id: item.id.to_s, title: "New Title", active: false }
      )

      payload = json.dig("data", "updateShopItem")
      expect(payload["errors"]).to be_empty
      expect(payload.dig("shopItem", "title")).to eq("New Title")
      expect(payload.dig("shopItem", "active")).to eq(false)
    end
  end

  # ── deleteShopItem mutation ───────────────────────────────────────────────────

  describe "deleteShopItem mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation DeleteShopItem($id: ID!) {
          deleteShopItem(input: { id: $id }) {
            success errors
          }
        }
      GRAPHQL
    end

    it "deletes an item with no orders" do
      item = create(:shop_item, studio: studio)
      sign_in(owner)
      json = graphql_post(query: mutation, variables: { id: item.id.to_s })

      payload = json.dig("data", "deleteShopItem")
      expect(payload["success"]).to be true
      expect(payload["errors"]).to be_empty
      expect(ShopItem.find_by(id: item.id)).to be_nil
    end
  end

  # ── createShopOrder mutation ──────────────────────────────────────────────────

  describe "createShopOrder mutation" do
    let(:client_record) { create(:client, studio: studio) }
    let(:mutation) do
      <<~GRAPHQL
        mutation CreateShopOrder($shopItemId: ID!, $quantity: Int, $clientId: ID) {
          createShopOrder(input: { shopItemId: $shopItemId, quantity: $quantity, clientId: $clientId }) {
            shopOrder { id quantity totalCents status shopItem { title } client { name } }
            errors
          }
        }
      GRAPHQL
    end

    context "as owner creating order for a client" do
      it "creates an order" do
        item = create(:shop_item, studio: studio, price_cents: 2000)
        sign_in(owner)
        json = graphql_post(
          query: mutation,
          variables: { shopItemId: item.id.to_s, quantity: 2, clientId: client_record.id.to_s }
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["errors"]).to be_empty
        expect(payload.dig("shopOrder", "quantity")).to eq(2)
        expect(payload.dig("shopOrder", "totalCents")).to eq(4000)
        expect(payload.dig("shopOrder", "status")).to eq("pending")
        expect(payload.dig("shopOrder", "shopItem", "title")).to eq(item.title)
      end

      it "decrements stock for limited-stock items" do
        item = create(:shop_item, :limited_stock, studio: studio, stock_quantity: 3, price_cents: 500)
        sign_in(owner)
        graphql_post(
          query: mutation,
          variables: { shopItemId: item.id.to_s, quantity: 2, clientId: client_record.id.to_s }
        )

        expect(item.reload.stock_quantity).to eq(1)
      end

      it "rejects order when stock is insufficient" do
        item = create(:shop_item, :limited_stock, studio: studio, stock_quantity: 1, price_cents: 500)
        sign_in(owner)
        json = graphql_post(
          query: mutation,
          variables: { shopItemId: item.id.to_s, quantity: 5, clientId: client_record.id.to_s }
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["shopOrder"]).to be_nil
        expect(payload["errors"].first).to match(/insufficient stock/i)
      end

      it "rejects order for inactive item" do
        item = create(:shop_item, :inactive, studio: studio)
        sign_in(owner)
        json = graphql_post(
          query: mutation,
          variables: { shopItemId: item.id.to_s, quantity: 1, clientId: client_record.id.to_s }
        )

        payload = json.dig("data", "createShopOrder")
        expect(payload["shopOrder"]).to be_nil
        expect(payload["errors"]).not_to be_empty
      end
    end
  end

  # ── shopOrders query ──────────────────────────────────────────────────────────

  describe "shopOrders query" do
    let(:query) do
      <<~GRAPHQL
        query {
          shopOrders {
            id status totalCents shopItem { title } client { name }
          }
        }
      GRAPHQL
    end

    it "returns orders for the owner's studio" do
      item    = create(:shop_item, studio: studio)
      client  = create(:client, studio: studio)
      order   = create(:shop_order, studio: studio, shop_item: item, client: client)

      sign_in(owner)
      json = graphql_post(query: query)

      expect(json["errors"]).to be_nil
      ids = json.dig("data", "shopOrders").map { |o| o["id"].to_i }
      expect(ids).to include(order.id)
    end

    it "does not return orders from another studio" do
      other_studio = create(:studio)
      other_item   = create(:shop_item, studio: other_studio)
      other_client = create(:client, studio: other_studio)
      other_order  = create(:shop_order, studio: other_studio, shop_item: other_item, client: other_client)

      sign_in(owner)
      json = graphql_post(query: query)

      ids = json.dig("data", "shopOrders").map { |o| o["id"].to_i }
      expect(ids).not_to include(other_order.id)
    end

    context "as client" do
      it "is not authorized to list all orders" do
        sign_in(client_user)
        json = graphql_post(query: query)

        expect(
          json["errors"]&.any? || json.dig("data", "shopOrders").nil?
        ).to be true
      end
    end
  end

  # ── updateShopOrder mutation ──────────────────────────────────────────────────

  describe "updateShopOrder mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation UpdateShopOrder($id: ID!, $status: String) {
          updateShopOrder(input: { id: $id, status: $status }) {
            shopOrder { id status }
            errors
          }
        }
      GRAPHQL
    end

    it "marks an order as paid" do
      item  = create(:shop_item, studio: studio)
      client_record = create(:client, studio: studio)
      order = create(:shop_order, studio: studio, shop_item: item, client: client_record)

      sign_in(owner)
      json = graphql_post(query: mutation, variables: { id: order.id.to_s, status: "paid" })

      payload = json.dig("data", "updateShopOrder")
      expect(payload["errors"]).to be_empty
      expect(payload.dig("shopOrder", "status")).to eq("paid")
    end
  end
end
