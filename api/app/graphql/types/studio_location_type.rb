module Types
  class StudioLocationType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :address, String, null: true
    field :city, String, null: true
    field :state, String, null: true
    field :zip, String, null: true
  end
end
