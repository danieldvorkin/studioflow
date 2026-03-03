# frozen_string_literal: true

module Mutations
  class UpsertStudioSubscription < BaseMutation
    argument :studio_id, ID, required: true
    argument :tier, String, required: false
    argument :status, String, required: false
    argument :stripe_customer_id, String, required: false
    argument :stripe_subscription_id, String, required: false
    argument :current_period_end, GraphQL::Types::ISO8601DateTime, required: false
    argument :notes, String, required: false

    field :studio_subscription, Types::StudioSubscriptionType, null: true
    field :errors, [ String ], null: false

    def resolve(studio_id:, tier: nil, status: nil, stripe_customer_id: nil,
                stripe_subscription_id: nil, current_period_end: nil, notes: nil)
      current_user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless current_user&.godmode?

      studio = Studio.find_by(id: studio_id)
      return { studio_subscription: nil, errors: [ "Studio not found" ] } unless studio

      if tier.present? && !StudioSubscription::TIERS.include?(tier)
        return { studio_subscription: nil, errors: [ "Invalid tier. Must be one of: #{StudioSubscription::TIERS.join(', ')}" ] }
      end

      if status.present? && !StudioSubscription::STATUSES.include?(status)
        return { studio_subscription: nil, errors: [ "Invalid status. Must be one of: #{StudioSubscription::STATUSES.join(', ')}" ] }
      end

      sub = StudioSubscription.find_or_initialize_by(studio_id: studio.id)
      sub.tier = tier if tier.present?
      sub.status = status if status.present?
      sub.stripe_customer_id = stripe_customer_id if stripe_customer_id.present?
      sub.stripe_subscription_id = stripe_subscription_id if stripe_subscription_id.present?
      sub.current_period_end = current_period_end if current_period_end.present?
      sub.notes = notes unless notes.nil?
      sub.cancelled_at = Time.current if status == "cancelled" && sub.cancelled_at.nil?
      sub.cancelled_at = nil if status.present? && status != "cancelled"

      if sub.save
        { studio_subscription: sub, errors: [] }
      else
        { studio_subscription: nil, errors: sub.errors.full_messages }
      end
    end
  end
end
