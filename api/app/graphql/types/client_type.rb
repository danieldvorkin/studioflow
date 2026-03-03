module Types
  class ClientType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :email, String, null: false
    field :phone, String, null: true

    field :characteristic_scores, GraphQL::Types::JSON, null: false,
      description: 'Instructor-facing characteristics scoring for this client'

    field :client_notes, [ Types::ClientNoteType ], null: false,
      description: 'Private notes about the client (visible to owners/staff, and to instructors who have taught the client)'

    def client_notes
      object.client_notes.includes(:author).order(created_at: :desc).limit(100)
    end

    field :bookings, [ Types::BookingType ], null: false,
      description: 'Booking history for this client (role-scoped)' do
      argument :limit, Integer, required: false
    end

    def bookings(limit: 200)
      user = context[:current_user]
      raise GraphQL::ExecutionError, 'Not authorized' unless user

      limit = [[limit.to_i, 1].max, 500].min

      scope = Booking.where(client_id: object.id, archived: false)

      if user.godmode?
        scope
      elsif user.owner? || user.staff?
        raise GraphQL::ExecutionError, 'Not authorized' unless object.studio_id == user.studio_id
      elsif user.instructor?
        raise GraphQL::ExecutionError, 'Not authorized' unless object.studio_id == user.studio_id
        scope = scope.joins(class_session: :instructor).where(class_sessions: { instructor_id: user.id })
      else
        raise GraphQL::ExecutionError, 'Not authorized'
      end

      scope.includes(:client, :class_session, :payment).order(created_at: :desc).limit(limit)
    end

    field :stripe_customer_id, String, null: true
    field :stripe_default_payment_method_id, String, null: true
    field :stripe_default_payment_method_brand, String, null: true
    field :stripe_default_payment_method_last4, String, null: true
    field :stripe_default_payment_method_exp_month, Integer, null: true
    field :stripe_default_payment_method_exp_year, Integer, null: true

    field :client_payment_methods, [ Types::ClientPaymentMethodType ], null: false,
      description: "Saved payment methods on file for this client"

    def client_payment_methods
      object.client_payment_methods.order(default: :desc, created_at: :desc)
    end

    field :user, Types::UserType, null: true,
      description: "Associated user account (if the client can sign in)"

    field :blocked_by_current_instructor, Boolean, null: false,
    description: "Whether the current instructor has blocked this client from booking"

    def blocked_by_current_instructor
    user = context[:current_user]
    return false unless user&.instructor?

    InstructorClientBlock.exists?(instructor_id: user.id, client_id: object.id)
    end
  end
end

