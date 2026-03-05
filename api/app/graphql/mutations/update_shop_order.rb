module Mutations
  class UpdateShopOrder < BaseMutation
    argument :id, ID, required: true
    argument :status, String, required: false
    argument :returned_at, GraphQL::Types::ISO8601Date, required: false
    argument :rental_due_date, GraphQL::Types::ISO8601Date, required: false
    argument :notes, String, required: false

    field :shop_order, Types::ShopOrderType, null: true
    field :errors, [ String ], null: false

    def resolve(id:, **attrs)
      user = context[:current_user]

      # Clients can update their own orders (extend / early return)
      order = if user.client?
        client_ids = Client.where(user_id: user.id).select(:id)
        ShopOrder.where(client_id: client_ids).find_by(id: id)
      else
        raise Pundit::NotAuthorizedError unless Pundit.policy!(user, ShopOrder).update?
        ShopOrder.where(studio_id: user.studio_id).find_by(id: id)
      end

      return { shop_order: nil, errors: [ "Order not found" ] } unless order

      # Clients may only extend the due date or do an early return (set returned_at + status)
      if user.client?
        allowed_keys = %i[rental_due_date returned_at status]
        attrs = attrs.slice(*allowed_keys)
        # Clients can only set status to "returned"
        if attrs[:status].present? && attrs[:status] != "returned"
          return { shop_order: nil, errors: [ "Not authorized to set that status" ] }
        end
      end

      # Restore stock when a limited-stock order is cancelled or a rental is returned
      restoring_statuses = %w[returned cancelled]
      if restoring_statuses.include?(attrs[:status]) &&
         !restoring_statuses.include?(order.status) &&
         order.shop_item.stock_quantity
        order.shop_item.increment!(:stock_quantity, order.quantity)
      end

      if order.update(attrs.compact)
        { shop_order: order, errors: [] }
      else
        { shop_order: nil, errors: order.errors.full_messages }
      end
    end
  end
end
