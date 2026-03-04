# frozen_string_literal: true

module Types
  class PublicClassPageType < Types::BaseObject
    field :studio_name, String, null: false
    field :studio_invite_code, String, null: false
    field :template, Types::ClassTemplateType, null: false
    field :upcoming_sessions, [ Types::ClassSessionType ], null: false
  end
end
