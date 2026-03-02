module Mutations
  class UpdateBundleProduct < BaseMutation
    argument :id, ID, required: true
    argument :title, String, required: false
    argument :description, String, required: false
    argument :active, Boolean, required: false

    argument :credits_count, Integer, required: false
    argument :price_cents, Integer, required: false
    argument :currency, String, required: false

    argument :class_template_id, ID, required: false
    argument :instructor_id, ID, required: false

    field :bundle_product, Types::BundleProductType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, **attrs)
      user = context[:current_user]
      bundle_product = BundleProduct.where(studio_id: user&.studio_id).find(id)
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, bundle_product).update?

      if bundle_product.update(attrs.compact)
        { bundle_product: bundle_product, errors: [] }
      else
        { bundle_product: nil, errors: bundle_product.errors.full_messages }
      end
    end
  end
end
