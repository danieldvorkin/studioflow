module Mutations
  class UpdateShopItem < BaseMutation
    argument :id, ID, required: true
    argument :title, String, required: false
    argument :description, String, required: false
    argument :price_cents, Integer, required: false
    argument :currency, String, required: false
    argument :item_type, String, required: false
    argument :stock_quantity, Integer, required: false
    argument :active, Boolean, required: false
    argument :image_url, String, required: false
    argument :studio_location_id, ID, required: false
    argument :rental_agreement_text, String, required: false

    field :shop_item, Types::ShopItemType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, **attrs)
      user = context[:current_user]
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, ShopItem).update?

      shop_item = ShopItem.where(studio_id: user.studio_id).find(id)

      if shop_item.update(attrs.compact)
        { shop_item: shop_item, errors: [] }
      else
        { shop_item: nil, errors: shop_item.errors.full_messages }
      end
    end
  end
end
