# frozen_string_literal: true

module Mutations
  class UpdateStudio < BaseMutation
    argument :name, String, required: false
    argument :slug, String, required: false

    field :studio, Types::StudioType, null: true
    field :errors, [ String ], null: false

    def resolve(name: nil, slug: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner?

      studio = user.studio
      return { studio: nil, errors: [ "Studio not found" ] } unless studio

      attrs = {}
      attrs[:name] = name.strip if name.present?
      if slug.present?
        attrs[:slug] = slug.strip.downcase.gsub(/[^a-z0-9\-]/, "-").squeeze("-").gsub(/^-|-$/, "")
      end

      if studio.update(attrs)
        { studio: studio, errors: [] }
      else
        { studio: nil, errors: studio.errors.full_messages }
      end
    end
  end
end
