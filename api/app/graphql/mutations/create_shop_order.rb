module Mutations
  class CreateShopOrder < BaseMutation
    argument :shop_item_id, ID, required: true
    argument :quantity, Integer, required: false
    argument :client_id, ID, required: false
    argument :rental_due_date, GraphQL::Types::ISO8601Date, required: false
    argument :notes, String, required: false
    argument :rental_agreement_accepted_at, GraphQL::Types::ISO8601DateTime, required: false
    argument :payment_method_id, String, required: false

    field :shop_order, Types::ShopOrderType, null: true
    field :errors, [ String ], null: false

    def resolve(shop_item_id:, quantity: 1, client_id: nil, rental_due_date: nil, notes: nil,
                rental_agreement_accepted_at: nil, payment_method_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authenticated" unless user

      shop_item = ShopItem.where(active: true).find_by(id: shop_item_id)
      return { shop_order: nil, errors: [ "Shop item not found or unavailable" ] } unless shop_item

      unless shop_item.in_stock?
        return { shop_order: nil, errors: [ "Item is out of stock" ] }
      end

      # Rental items require agreement acceptance
      if shop_item.rental? && rental_agreement_accepted_at.nil?
        return { shop_order: nil, errors: [ "You must accept the rental agreement before proceeding" ] }
      end

      # Payment is required for paid items when a payment endpoint is available
      if shop_item.price_cents > 0 && payment_method_id.blank? && user.client?
        return { shop_order: nil, errors: [ "A payment method is required to complete this order" ] }
      end

      # Resolve client
      client = if user.client?
        Client.find_or_initialize_by(user_id: user.id, studio_id: shop_item.studio_id).tap do |c|
          c.name  ||= user.name
          c.email ||= user.email
          c.save!
        end
      else
        return { shop_order: nil, errors: [ "client_id is required" ] } if client_id.blank?
        Client.where(studio_id: shop_item.studio_id).find_by(id: client_id)
      end

      return { shop_order: nil, errors: [ "Client not found" ] } unless client

      # Decrement stock if finite
      if shop_item.stock_quantity
        shop_item.with_lock do
          if shop_item.stock_quantity < quantity
            return { shop_order: nil, errors: [ "Insufficient stock (#{shop_item.stock_quantity} left)" ] }
          end
          shop_item.update!(stock_quantity: shop_item.stock_quantity - quantity)
        end
      end

      order = ShopOrder.new(
        shop_item: shop_item,
        client: client,
        studio_id: shop_item.studio_id,
        quantity: quantity,
        total_cents: shop_item.price_cents * quantity,
        currency: shop_item.currency,
        status: "pending",
        rental_due_date: rental_due_date,
        rental_agreement_accepted_at: rental_agreement_accepted_at,
        notes: notes
      )

      unless order.save
        # Roll back stock decrement on save failure
        shop_item.increment!(:stock_quantity, quantity) if shop_item.stock_quantity
        return { shop_order: nil, errors: order.errors.full_messages }
      end

      # ── Stripe charge ──────────────────────────────────────────────────
      if payment_method_id.present? && order.total_cents > 0
        settings = PaymentSetting.instance_for(shop_item.studio)

        unless settings.configured?
          shop_item.increment!(:stock_quantity, quantity) if shop_item.stock_quantity
          order.destroy
          return { shop_order: nil, errors: [ "Stripe is not configured for this studio" ] }
        end

        Stripe.api_key = settings.stripe_secret_key

        begin
          intent_params = {
            amount: order.total_cents,
            currency: order.currency,
            payment_method: payment_method_id,
            confirm: true,
            off_session: false,
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: "never"
            },
            metadata: {
              shop_order_id: order.id,
              client_id: client.id,
              studio_id: shop_item.studio_id
            }
          }
          intent_params[:customer] = client.stripe_customer_id if client.stripe_customer_id.present?
          intent = Stripe::PaymentIntent.create(intent_params)

          order.update!(stripe_payment_intent_id: intent.id, status: "paid")
        rescue Stripe::CardError, Stripe::StripeError => e
          shop_item.increment!(:stock_quantity, quantity) if shop_item.stock_quantity
          order.destroy
          return { shop_order: nil, errors: [ e.message ] }
        end
      end
      # ──────────────────────────────────────────────────────────────────

      # Send order confirmation email — swallow errors so payment is never rolled back
      begin
        ShopOrderMailer.with(order: order).order_confirmation.deliver_later
        owner = order.studio.users.find_by(role: User::ROLES[:owner])
        ShopOrderMailer.with(order: order, owner: owner).owner_notification.deliver_later if owner&.email.present?
      rescue => _e
        # Non-fatal: email will be retried via ActiveJob or dropped
      end

      { shop_order: order, errors: [] }
    end
  end
end
