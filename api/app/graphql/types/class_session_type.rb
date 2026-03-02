module Types
  class ClassSessionType < Types::BaseObject
    field :id, ID, null: false
    field :class_template, Types::ClassTemplateType, null: false
    field :start_time, GraphQL::Types::ISO8601DateTime, null: false
    field :end_time, GraphQL::Types::ISO8601DateTime, null: true
    field :instructor, Types::UserType, null: true
    field :capacity, Integer, null: true
    field :room, String, null: true
    field :seats_available, Integer, null: false

    def seats_available
      object.seats_available
    end
  end
end
