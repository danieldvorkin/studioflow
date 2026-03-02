module Mutations
  class CreateBundleProduct < BaseMutation
    argument :title, String, required: true
    argument :description, String, required: false
    argument :active, Boolean, required: false

    argument :credits_count, Integer, required: true
    argument :price_cents, Integer, required: true
    argument :currency, String, required: true

    argument :class_template_id, ID, required: false
    argument :instructor_id, ID, required: false

    field :bundle_product, Types::BundleProductType, null: true
    field :errors, [ String ], null: false

    def resolve(**attrs)
      user = context[:current_user]
      raise Pundit::NotAuthorizedError unless Pundit.policy!(user, BundleProduct).create?

      bundle_product = BundleProduct.new(
        studio_id: user.studio_id,
        title: attrs[:title],
        description: attrs[:description],
        active: attrs.key?(:active) ? attrs[:active] : true,
        credits_count: attrs[:credits_count],
        price_cents: attrs[:price_cents],
        currency: attrs[:currency],
        class_template_id: attrs[:class_template_id],
        instructor_id: attrs[:instructor_id]
      )

      if bundle_product.save
        { bundle_product: bundle_product, errors: [] }
      else
        { bundle_product: nil, errors: bundle_product.errors.full_messages }
      end
    end
  end
end
