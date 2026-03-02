module Mutations
  class DeleteBundleProduct < BaseMutation
    argument :id, ID, required: true

    field :success, Boolean, null: false
    field :errors, [ String ], null: false

    def resolve(id:)
      user = context[:current_user]
      bundle_product = BundleProduct.where(studio_id: user&.studio_id).find(id)
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, bundle_product).destroy?

      if bundle_product.update(active: false)
        { success: true, errors: [] }
      else
        { success: false, errors: bundle_product.errors.full_messages }
      end
    end
  end
end
