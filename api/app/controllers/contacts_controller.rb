# frozen_string_literal: true

class ContactsController < ApplicationController
  skip_before_action :verify_authenticity_token, raise: false

  def create
    name    = params[:name].to_s.strip
    email   = params[:email].to_s.strip
    message = params[:message].to_s.strip

    if name.blank? || email.blank? || message.blank?
      render json: { error: "name, email, and message are required" }, status: :unprocessable_entity
      return
    end

    ContactMailer.contact_message(name: name, email: email, message: message).deliver_later

    Rails.logger.info("[Contact] Message from #{name} <#{email}>")
    render json: { sent: true }, status: :ok
  rescue StandardError => e
    Rails.logger.error("[Contact] Failed to queue message: #{e.class}: #{e.message}")
    render json: { error: "Could not send message" }, status: :internal_server_error
  end
end
