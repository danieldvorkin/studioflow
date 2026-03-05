module Types
  class ShopItemType < Types::BaseObject
    field :id, ID, null: false
    field :studio_id, ID, null: false
    field :studio_location_id, ID, null: true
    field :title, String, null: false
    field :description, String, null: true
    field :price_cents, Integer, null: false
    field :currency, String, null: false
    field :item_type, String, null: false
    field :stock_quantity, Integer, null: true
    field :active, Boolean, null: false
    field :image_url, String, null: true
    field :rental_agreement_text, String, null: true
    field :in_stock, Boolean, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false

    def in_stock
      object.in_stock?
    end
  end
end
