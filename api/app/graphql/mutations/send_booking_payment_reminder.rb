module Mutations
  class SendBookingPaymentReminder < BaseMutation
    argument :booking_id, ID, required: true

    field :success, Boolean, null: false
    field :checkout_url, String, null: true
    field :errors, [ String ], null: false

    def resolve(booking_id:)
      user = context[:current_user]
      return { success: false, checkout_url: nil, errors: [ "Not authenticated" ] } unless user

      booking = Booking.includes(:studio, :client, class_session: :class_template).find(booking_id)

      authorized = booking.studio_id == user.studio_id && (
        user.owner? || user.staff? || (user.instructor? && booking.class_session.instructor_id == user.id)
      )

      return { success: false, checkout_url: nil, errors: [ "Not authorized" ] } unless authorized

      if booking.status == "cancelled"
        return { success: false, checkout_url: nil, errors: [ "Booking is cancelled" ] }
      end

      if booking.paid?
        return { success: false, checkout_url: nil, errors: [ "Booking is already paid" ] }
      end

      settings = PaymentSetting.instance_for(booking.studio)
      unless settings.configured?
        return { success: false, checkout_url: nil, errors: [ "Stripe is not configured" ] }
      end

      template = booking.class_session.class_template
      amount_cents = booking.price_cents.presence || template.price_cents
      if amount_cents.to_i <= 0
        return { success: false, checkout_url: nil, errors: [ "Class has no price configured" ] }
      end

      currency = template.currency.presence || settings.default_currency.presence || "cad"
      Stripe.api_key = settings.stripe_secret_key

      web_url = ENV["WEB_APP_URL"].presence || "http://localhost:5173"
      success_url = "#{web_url}/bookings/#{booking.id}?checkout_session_id={CHECKOUT_SESSION_ID}"
      cancel_url = "#{web_url}/bookings/#{booking.id}"

      begin
        session_params = {
          mode: "payment",
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: currency,
                unit_amount: amount_cents,
                product_data: {
                  name: template.title
                }
              }
            }
          ],
          success_url: success_url,
          cancel_url: cancel_url,
          metadata: {
            booking_id: booking.id,
            class_session_id: booking.class_session_id,
            client_id: booking.client_id
          }
        }

        if booking.client&.stripe_customer_id.present?
          session_params[:customer] = booking.client.stripe_customer_id
        end

        checkout_session = Stripe::Checkout::Session.create(session_params)
      rescue Stripe::StripeError => e
        return { success: false, checkout_url: nil, errors: [ e.message ] }
      end

      BookingMailer.with(booking: booking, checkout_url: checkout_session.url).payment_reminder.deliver_later

      { success: true, checkout_url: checkout_session.url, errors: [] }
    rescue ActiveRecord::RecordNotFound
      { success: false, checkout_url: nil, errors: [ "Booking not found" ] }
    end
  end
end
