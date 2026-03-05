# frozen_string_literal: true

# WebhookHandlerService processes incoming custom webhook events.
# Extend #handle_event with real business logic as needed.
class WebhookHandlerService
  def initialize(event_type:, payload:, headers:)
    @event_type = event_type.to_s
    @payload    = payload
    @headers    = headers
  end

  def call
    Rails.logger.info("[Webhook] Received event: #{@event_type} | payload: #{@payload.inspect}")
    handle_event
  end

  private

  def handle_event
    case @event_type
    else
      Rails.logger.info("[Webhook] No handler for event type '#{@event_type}' — logged and ignored")
    end
  end
end
