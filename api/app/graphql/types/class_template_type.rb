module Types
  class ClassTemplateType < Types::BaseObject
    field :id, ID, null: false
    field :title, String, null: false
    field :description, String, null: true
    field :capacity, Integer, null: true
    field :duration_minutes, Integer, null: true
    field :studio_location, Types::StudioLocationType, null: true
    field :instructor, Types::UserType, null: true
    field :price_cents, Integer, null: false
    field :currency, String, null: true

    field :compensation_type, String, null: true
    field :instructor_split_percent, Integer, null: true
    field :instructor_flat_rate_cents, Integer, null: true

    field :approved, Boolean, null: false
  end
end
