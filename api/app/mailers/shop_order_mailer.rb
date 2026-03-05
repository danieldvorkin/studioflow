class ShopOrderMailer < ApplicationMailer
  default from: ENV.fetch("MAILER_FROM", "onboarding@resend.dev")

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
end
