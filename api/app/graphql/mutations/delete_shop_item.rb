module Mutations
  class DeleteShopItem < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, ShopItem).destroy?

      shop_item = ShopItem.where(studio_id: user.studio_id).find(id)
      shop_item.destroy

      { success: true, errors: [] }
    rescue ActiveRecord::DeleteRestrictionError => e
      { success: false, errors: [ e.message ] }
    end
  end
end
