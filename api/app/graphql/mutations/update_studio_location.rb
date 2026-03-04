module Mutations
  class UpdateStudioLocation < BaseMutation
    argument :id, ID, required: true
    argument :name, String, required: false
    argument :address, String, required: false
    argument :city, String, required: false
    argument :state, String, required: false
    argument :zip, String, required: false

    field :studio_location, Types::StudioLocationType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, name: nil, address: nil, city: nil, state: nil, zip: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner? || user&.moderator?

      location = StudioLocation.where(studio_id: user.studio_id).find_by(id: id)
      return { studio_location: nil, errors: [ "Studio location not found" ] } unless location

      attrs = {
        name: name,
        address: address,
        city: city,
        state: state,
        zip: zip
      }.compact

      if location.update(attrs)
        { studio_location: location, errors: [] }
      else
        { studio_location: nil, errors: location.errors.full_messages }
      end
    end
  end
end
