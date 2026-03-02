# frozen_string_literal: true

module Mutations
  class UpdateUser < BaseMutation
    argument :id, ID, required: true
    argument :name, String, required: false
    argument :email, String, required: false
    argument :role, Integer, required: false
    argument :active, Boolean, required: false
    argument :available_for_sessions, Boolean, required: false

    argument :instructor_compensation_type, String, required: false
    argument :instructor_default_split_percent, Integer, required: false
    argument :instructor_default_flat_rate_cents, Integer, required: false
    argument :stripe_connect_account_id, String, required: false

    field :user, Types::UserType, null: true
    field :errors, [String], null: false

    def resolve(id:, **attrs)
      current_user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless current_user&.owner?

      user = User.where(studio_id: current_user.studio_id).find_by(id: id)
      return { user: nil, errors: ["User not found"] } unless user

      if attrs.key?(:role) && !User::ROLES.value?(attrs[:role])
        return { user: nil, errors: ["Invalid role value"] }
      end

      if attrs.key?(:instructor_compensation_type) && !%w[revenue_share flat_rate].include?(attrs[:instructor_compensation_type].to_s)
        return { user: nil, errors: ["Invalid instructor compensation type"] }
      end

      if attrs.key?(:instructor_default_split_percent)
        v = attrs[:instructor_default_split_percent]
        return { user: nil, errors: ["Invalid instructor split percent"] } unless v.is_a?(Integer) && v.between?(0, 100)
      end

      if attrs.key?(:instructor_default_flat_rate_cents)
        v = attrs[:instructor_default_flat_rate_cents]
        return { user: nil, errors: ["Invalid instructor flat rate"] } unless v.is_a?(Integer) && v >= 0
      end

      if user.update(attrs.compact)
        { user:, errors: [] }
      else
        { user: nil, errors: user.errors.full_messages }
      end
    end
  end
end
