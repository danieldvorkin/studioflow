# frozen_string_literal: true

class UserMailer < ApplicationMailer
  # Sent to an owner immediately after their studio account is created.
  def signup_confirmation
    @user   = params[:user]
    @studio = params[:studio]
    @login_url = "#{ENV.fetch('WEB_APP_URL', 'http://localhost:5173')}/login"

    mail(to: @user.email, subject: "Welcome to StudioFlow — your studio is ready!")
  end

  # Sent when a user requests a password reset.
  def reset_password_instructions
    @user      = params[:user]
    @reset_url = params[:reset_url]

    mail(to: @user.email, subject: "Reset your StudioFlow password")
  end
end
