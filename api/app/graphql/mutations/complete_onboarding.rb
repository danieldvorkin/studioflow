# frozen_string_literal: true

module Mutations
  class CompleteOnboarding < BaseMutation
    field :studio, Types::StudioType, null: true
    field :errors, [ String ], null: false

    def resolve
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner?

      studio = user.studio
      return { studio: nil, errors: [ "Studio not found" ] } unless studio

      studio.update!(onboarding_completed_at: Time.current) unless studio.onboarding_completed_at?
      { studio: studio, errors: [] }
    end
  end
end
