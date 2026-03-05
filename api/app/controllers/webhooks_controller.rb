# frozen_string_literal: true

class WebhooksController < ApplicationController
  # Skip CSRF and authentication — webhook senders won't have a session token.
  # Add signature verification here once a shared secret is established.
  skip_before_action :verify_authenticity_token, raise: false

  def receive
    payload    = JSON.parse(request.body.read, symbolize_names: true)
    event_type = payload[:event] || payload[:type] || "unknown"

    WebhookHandlerService.new(
      event_type: event_type,
      payload:    payload,
      headers:    request.headers.to_h.select { |k, _| k.start_with?("HTTP_") || k == "CONTENT_TYPE" }
    ).call

    render json: { received: true }, status: :ok
  rescue JSON::ParserError
    Rails.logger.warn("[Webhook] Received non-JSON body")
    render json: { error: "Invalid JSON payload" }, status: :bad_request
  rescue StandardError => e
    Rails.logger.error("[Webhook] Unhandled error: #{e.class}: #{e.message}")
    render json: { error: "Internal error" }, status: :internal_server_error
  end
end
