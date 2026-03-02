module Mutations
  class CreateStudioLocation < BaseMutation
    argument :name, String, required: true
    argument :address, String, required: false
    argument :city, String, required: false
    argument :state, String, required: false
    argument :zip, String, required: false

    field :studio_location, Types::StudioLocationType, null: true
    field :errors, [ String ], null: false

    def resolve(name:, address: nil, city: nil, state: nil, zip: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner?

      location = StudioLocation.new(
        studio: user.studio,
        name: name,
        address: address,
        city: city,
        state: state,
        zip: zip
      )

      if location.save
        { studio_location: location, errors: [] }
      else
        { studio_location: nil, errors: location.errors.full_messages }
      end
    end
  end
end
