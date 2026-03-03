module Mutations
  class PurchaseClientMembership < BaseMutation
    argument :membership_plan_id, ID,     required: true
    argument :payment_method_id,  String, required: false

    field :client_membership, Types::ClientMembershipType, null: true
    field :errors, [ String ], null: false

    def resolve(membership_plan_id:, payment_method_id: nil)
      user = context[:current_user]
      return { client_membership: nil, errors: [ "Not authenticated" ] } unless user
      return { client_membership: nil, errors: [ "Not authorized" ] } unless user.client?

      plan = MembershipPlan.where(active: true).find_by(id: membership_plan_id)
      return { client_membership: nil, errors: [ "Membership plan not found or unavailable" ] } unless plan

      studio = Studio.find(plan.studio_id)

      # Find or create the client record for this user+studio
      client = Client.find_or_initialize_by(user_id: user.id, studio_id: studio.id).tap do |c|
        c.name  ||= user.name
        c.email ||= user.email
        c.save!
      end

      # Prevent duplicate active enrollments
      if ClientMembership.exists?(client_id: client.id, membership_plan_id: plan.id, status: "active")
        return { client_membership: nil, errors: [ "You already have an active membership for this plan" ] }
      end

      stripe_payment_intent_id = nil

      # Charge via Stripe if the plan has a price
      if plan.price_cents.to_i > 0
        settings = PaymentSetting.instance_for(studio)
        unless settings.configured?
          return { client_membership: nil, errors: [ "Payments are not configured for this studio" ] }
        end

        resolved_payment_method_id = payment_method_id.presence ||
          client.client_payment_methods.find_by(default: true)&.stripe_payment_method_id ||
          client.stripe_default_payment_method_id

        if resolved_payment_method_id.blank?
          return { client_membership: nil, errors: [ "No payment method on file. Please add a card first." ] }
        end

        Stripe.api_key = settings.stripe_secret_key

        begin
          intent_params = {
            amount:   plan.price_cents,
            currency: plan.currency,
            payment_method: resolved_payment_method_id,
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: "never" },
            metadata: {
              membership_plan_id: plan.id,
              client_id: client.id,
              user_id: user.id
            }
          }
          intent_params[:customer] = client.stripe_customer_id if client.stripe_customer_id.present?

          intent = Stripe::PaymentIntent.create(intent_params)
        rescue Stripe::StripeError => e
          return { client_membership: nil, errors: [ e.message ] }
        end

        unless intent.status == "succeeded"
          return { client_membership: nil, errors: [ "Payment did not succeed (status: #{intent.status})" ] }
        end

        stripe_payment_intent_id = intent.id
      end

      membership = ClientMembership.create!(
        studio_id:                plan.studio_id,
        client:                   client,
        membership_plan:          plan,
        status:                   "active",
        started_at:               Date.today,
        price_cents:              plan.price_cents,
        currency:                 plan.currency,
        stripe_payment_intent_id: stripe_payment_intent_id
      )

      { client_membership: membership, errors: [] }
    end
  end
end
