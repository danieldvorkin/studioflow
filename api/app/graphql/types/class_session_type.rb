module Types
  class ClassSessionType < Types::BaseObject
    field :id, ID, null: false
    field :class_template, Types::ClassTemplateType, null: false
    field :studio_id, ID, null: true
    field :start_time, GraphQL::Types::ISO8601DateTime, null: false
    field :end_time, GraphQL::Types::ISO8601DateTime, null: true
    field :instructor, Types::UserType, null: true
    field :capacity, Integer, null: true
    field :room, String, null: true
    field :seats_available, Integer, null: false

    def studio_id
      object&.class_template&.studio_location&.studio_id
    end

    def seats_available
      object.seats_available
    end
  end
end
