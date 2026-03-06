# frozen_string_literal: true

module Types
  class StudioPageType < Types::BaseObject
    field :id,         ID,      null: false
    field :title,      String,  null: false
    field :slug,       String,  null: false
    field :content,    String,  null: true
    field :published,  Boolean, null: false
    field :position,   Integer, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
