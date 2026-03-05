module Mutations
  class CreateStudioLocation < BaseMutation
    argument :name, String, required: true
    argument :address, String, required: false
    argument :city, String, required: false
    argument :state, String, required: false
    argument :zip, String, required: false
    argument :studio_id, ID, required: false

    field :studio_location, Types::StudioLocationType, null: true
    field :errors, [ String ], null: false

    def resolve(name:, address: nil, city: nil, state: nil, zip: nil, studio_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.godmode? || user&.owner? || user&.moderator?

      effective_studio =
        if user.godmode? && studio_id.present?
          Studio.find_by(id: studio_id) || user.studio
        else
          user.studio
        end

      location = StudioLocation.new(
        studio: effective_studio,
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
