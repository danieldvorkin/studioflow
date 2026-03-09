# frozen_string_literal: true

class MessageMailer < ApplicationMailer
  def new_message
    @message = params[:message]
    @recipient = params[:recipient]
    @sender = @message.sender
    @conversation_url = conversation_url_for(@message.conversation)

    mail(
      to: @recipient.email,
      subject: "New message from #{@sender.name || @sender.email}"
    )
  end

  private

  def conversation_url_for(conversation)
    host = ENV.fetch("APP_HOST", "localhost:5173")
    protocol = Rails.env.development? ? "http" : "https"
    "#{protocol}://#{host}/messages/#{conversation.id}"
  end
end