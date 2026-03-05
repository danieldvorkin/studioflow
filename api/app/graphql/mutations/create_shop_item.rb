module Mutations
  class CreateShopItem < BaseMutation
    argument :title, String, required: true
    argument :description, String, required: false
    argument :price_cents, Integer, required: true
    argument :currency, String, required: false
    argument :item_type, String, required: false
    argument :stock_quantity, Integer, required: false
    argument :active, Boolean, required: false
    argument :image_url, String, required: false
    argument :studio_location_id, ID, required: false
    argument :rental_agreement_text, String, required: false

    field :shop_item, Types::ShopItemType, null: true
    field :errors, [ String ], null: false

    def resolve(**attrs)
      user = context[:current_user]
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, ShopItem).create?

      shop_item = ShopItem.new(
        studio_id: user.studio_id,
        studio_location_id: attrs[:studio_location_id],
        title: attrs[:title],
        description: attrs[:description],
        price_cents: attrs[:price_cents],
        currency: attrs.fetch(:currency, "cad"),
        item_type: attrs.fetch(:item_type, "sale"),
        stock_quantity: attrs[:stock_quantity],
        active: attrs.key?(:active) ? attrs[:active] : true,
        image_url: attrs[:image_url],
        rental_agreement_text: attrs[:rental_agreement_text]
      )

      if shop_item.save
        { shop_item: shop_item, errors: [] }
      else
        { shop_item: nil, errors: shop_item.errors.full_messages }
      end
    end
  end
end
