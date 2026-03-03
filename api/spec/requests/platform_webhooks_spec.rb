require "rails_helper"

RSpec.describe PlatformWebhooksController, type: :request do
  let(:webhook_secret) { "whsec_test_secret" }

  before do
    stub_const("ENV", ENV.to_h.merge("PLATFORM_STRIPE_WEBHOOK_SECRET" => webhook_secret))
  end

  # Build a signed Stripe webhook payload
  def stripe_event_payload(type:, data:)
    payload = JSON.generate({
      id: "evt_#{SecureRandom.hex(8)}",
      type: type,
      data: { object: data }
    })
    timestamp = Time.now.to_i
    signed_payload = "#{timestamp}.#{payload}"
    signature = OpenSSL::HMAC.hexdigest("SHA256", webhook_secret, signed_payload)
    stripe_signature = "t=#{timestamp},v1=#{signature}"
    [ payload, stripe_signature ]
  end

  def post_webhook(type:, data:)
    payload, sig = stripe_event_payload(type: type, data: data)
    post "/stripe/platform-webhook",
         params: payload,
         headers: {
           "Content-Type" => "application/json",
           "Stripe-Signature" => sig
         }
  end

  describe "POST /stripe/platform-webhook" do
    it "returns 200 for a valid event" do
      studio = create(:studio)
      fake_stripe_sub = double("Stripe::Subscription", status: "trialing", current_period_end: 1.month.from_now.to_i)
      allow(Stripe::Subscription).to receive(:retrieve).with("sub_new").and_return(fake_stripe_sub)

      post_webhook(
        type: "checkout.session.completed",
        data: {
          mode: "subscription",
          subscription: "sub_new",
          customer: "cus_new",
          metadata: { studio_id: studio.id.to_s, tier: "basic" }
        }
      )
      expect(response).to have_http_status(:ok)
    end

    it "returns 401 for an invalid Stripe signature" do
      payload = JSON.generate({ type: "checkout.session.completed", data: { object: {} } })
      post "/stripe/platform-webhook",
           params: payload,
           headers: {
             "Content-Type" => "application/json",
             "Stripe-Signature" => "t=0,v1=badsig"
           }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 503 when webhook secret is not configured" do
      stub_const("ENV", ENV.to_h.except("PLATFORM_STRIPE_WEBHOOK_SECRET"))
      post "/stripe/platform-webhook",
           params: "{}",
           headers: { "Content-Type" => "application/json", "Stripe-Signature" => "t=0,v1=x" }
      expect(response).to have_http_status(:service_unavailable)
    end
  end

  # ─── checkout.session.completed ──────────────────────────────────────────────

  describe "checkout.session.completed" do
    let(:studio) { create(:studio) }

    it "creates a StudioSubscription set to trialing (7-day trial)" do
      fake_stripe_sub = double("Stripe::Subscription", status: "trialing", current_period_end: 30.days.from_now.to_i)
      allow(Stripe::Subscription).to receive(:retrieve).with("sub_new123").and_return(fake_stripe_sub)
      allow(Stripe).to receive(:api_key=)

      expect {
        post_webhook(
          type: "checkout.session.completed",
          data: {
            mode: "subscription",
            subscription: "sub_new123",
            customer: "cus_abc",
            metadata: { studio_id: studio.id.to_s, tier: "basic" }
          }
        )
      }.to change(StudioSubscription, :count).by(1)

      sub = StudioSubscription.find_by!(studio: studio)
      expect(sub.status).to eq("trialing")
      expect(sub.tier).to eq("basic")
      expect(sub.stripe_customer_id).to eq("cus_abc")
      expect(sub.stripe_subscription_id).to eq("sub_new123")
      expect(sub.current_period_end).to be_present
    end

    it "sets status from the Stripe subscription object on checkout completion" do
      existing = create(:studio_subscription, studio: studio, status: "trialing")
      fake_stripe_sub = double("Stripe::Subscription", status: "active", current_period_end: 30.days.from_now.to_i)
      allow(Stripe::Subscription).to receive(:retrieve).and_return(fake_stripe_sub)
      allow(Stripe).to receive(:api_key=)

      post_webhook(
        type: "checkout.session.completed",
        data: {
          mode: "subscription",
          subscription: "sub_existing",
          customer: "cus_abc",
          metadata: { studio_id: studio.id.to_s, tier: "premium" }
        }
      )

      expect(existing.reload.status).to eq("active")
    end

    it "ignores non-subscription checkout sessions" do
      post_webhook(
        type: "checkout.session.completed",
        data: {
          mode: "payment",
          subscription: nil,
          customer: "cus_abc",
          metadata: {}
        }
      )
      expect(StudioSubscription.count).to eq(0)
    end
  end

  # ─── customer.subscription.updated ───────────────────────────────────────────

  describe "customer.subscription.updated" do
    it "updates status to past_due" do
      sub = create(:studio_subscription, stripe_subscription_id: "sub_upd1", status: "active")

      post_webhook(
        type: "customer.subscription.updated",
        data: {
          id: "sub_upd1",
          status: "past_due",
          current_period_end: 5.days.from_now.to_i
        }
      )

      expect(sub.reload.status).to eq("past_due")
    end

    it "sets cancelled_at when status maps to cancelled" do
      sub = create(:studio_subscription, stripe_subscription_id: "sub_upd2", status: "active", cancelled_at: nil)

      post_webhook(
        type: "customer.subscription.updated",
        data: {
          id: "sub_upd2",
          status: "canceled",
          current_period_end: 1.day.ago.to_i
        }
      )

      expect(sub.reload.status).to eq("cancelled")
      expect(sub.reload.cancelled_at).not_to be_nil
    end

    it "clears cancelled_at when reactivated" do
      sub = create(:studio_subscription, :cancelled, stripe_subscription_id: "sub_upd3")

      post_webhook(
        type: "customer.subscription.updated",
        data: {
          id: "sub_upd3",
          status: "active",
          current_period_end: 30.days.from_now.to_i
        }
      )

      expect(sub.reload.status).to eq("active")
      expect(sub.reload.cancelled_at).to be_nil
    end

    it "silently ignores unknown subscription IDs" do
      post_webhook(
        type: "customer.subscription.updated",
        data: { id: "sub_unknown", status: "active", current_period_end: 30.days.from_now.to_i }
      )
      expect(response).to have_http_status(:ok)
    end
  end

  # ─── customer.subscription.deleted ───────────────────────────────────────────

  describe "customer.subscription.deleted" do
    it "marks the subscription cancelled" do
      sub = create(:studio_subscription, stripe_subscription_id: "sub_del1", status: "active")

      post_webhook(
        type: "customer.subscription.deleted",
        data: { id: "sub_del1", status: "canceled", current_period_end: 1.day.ago.to_i }
      )

      expect(sub.reload.status).to eq("cancelled")
      expect(sub.reload.cancelled_at).not_to be_nil
    end
  end

  # ─── invoice.payment_succeeded ───────────────────────────────────────────────

  describe "invoice.payment_succeeded" do
    it "sets status to active and updates period end" do
      sub = create(:studio_subscription, stripe_subscription_id: "sub_inv1", status: "past_due")
      new_period_end = 30.days.from_now.to_i

      post_webhook(
        type: "invoice.payment_succeeded",
        data: { subscription: "sub_inv1", period_end: new_period_end }
      )

      sub.reload
      expect(sub.status).to eq("active")
      expect(sub.current_period_end.to_i).to be_within(5).of(new_period_end)
    end
  end

  # ─── invoice.payment_failed ──────────────────────────────────────────────────

  describe "invoice.payment_failed" do
    it "sets status to past_due" do
      sub = create(:studio_subscription, stripe_subscription_id: "sub_fail1", status: "active")

      post_webhook(
        type: "invoice.payment_failed",
        data: { subscription: "sub_fail1" }
      )

      expect(sub.reload.status).to eq("past_due")
    end
  end
end
