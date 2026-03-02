module Types
  class BundleProductType < Types::BaseObject
    field :id, ID, null: false
    field :studio_id, ID, null: false

    field :title, String, null: false
    field :description, String, null: true
    field :active, Boolean, null: false

    field :credits_count, Integer, null: false
    field :price_cents, Integer, null: false
    field :currency, String, null: false

    field :class_template, Types::ClassTemplateType, null: true
    field :instructor, Types::UserType, null: true
  end
end
