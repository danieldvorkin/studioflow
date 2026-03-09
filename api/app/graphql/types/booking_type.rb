module Types
  class BookingType < Types::BaseObject
    field :id, ID, null: false
    field :studio_id, ID, null: false
    field :slug, String, null: true
    field :client, Types::ClientType, null: false
    field :class_session, Types::ClassSessionType, null: false
    field :status, String, null: false
    field :paid, Boolean, null: false
    field :price_cents, Integer, null: false
    field :archived, Boolean, null: false
    field :payment, Types::PaymentType, null: true
    field :bundle_purchase, Types::BundlePurchaseType, null: true
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
    field :waitlist_position, Integer, null: true

    def waitlist_position
      return nil unless object.waitlisted?

      object
        .class_session
        .bookings
        .where(status: Booking.statuses[:waitlisted])
        .order(:created_at)
        .pluck(:id)
        .index(object.id)
        &.+(1)
    end
  end
end
