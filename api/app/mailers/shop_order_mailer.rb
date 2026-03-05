class ShopOrderMailer < ApplicationMailer
  def order_confirmation
    @order = params[:order]
    @client = @order.client
    @item   = @order.shop_item

    @orders_url = begin
      host     = ENV.fetch("APP_HOST", "localhost:5173")
      protocol = Rails.env.development? ? "http" : "https"
      "#{protocol}://#{host}/my-orders"
    end

    mail(to: @client.email, subject: "Order confirmed — #{@item.title}")
  end

  def owner_notification
    @order  = params[:order]
    @client = @order.client
    @item   = @order.shop_item
    @owner  = params[:owner]

    @orders_url = begin
      host     = ENV.fetch("APP_HOST", "localhost:5173")
      protocol = Rails.env.development? ? "http" : "https"
      "#{protocol}://#{host}/shop/orders"
    end

    mail(to: @owner.email, subject: "New shop order — #{@item.title}")
  end
end
