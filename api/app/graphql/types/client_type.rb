module Types
  class ClientType < Types::BaseObject
    field :id, ID, null: false
    field :name, String, null: false
    field :email, String, null: false
    field :phone, String, null: true

    field :stripe_customer_id, String, null: true
    field :stripe_default_payment_method_id, String, null: true
    field :stripe_default_payment_method_brand, String, null: true
    field :stripe_default_payment_method_last4, String, null: true
    field :stripe_default_payment_method_exp_month, Integer, null: true
    field :stripe_default_payment_method_exp_year, Integer, null: true

    field :client_payment_methods, [Types::ClientPaymentMethodType], null: false,
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
