# frozen_string_literal: true

class UserMailer < ApplicationMailer
  # Sent to an owner immediately after their studio account is created.
  def signup_confirmation
    @user   = params[:user]
    @studio = params[:studio]
    @login_url = "#{web_app_base_url}/signin"

    mail(to: @user.email, subject: "Welcome to StudioFlow — your studio is ready!")
  end

  # Sent when a user requests a password reset.
  def reset_password_instructions
    @user      = params[:user]
    @reset_url = params[:reset_url]

    mail(to: @user.email, subject: "Reset your StudioFlow password")
  end

  # Sent when a studio owner/staff invites an instructor or staff member.
  def invite
    @user       = params[:user]
    @studio     = params[:studio]
    @invited_by = params[:invited_by]
    @reset_url  = params[:reset_url]

    role_label = User::ROLES.key(@user.role)&.to_s&.capitalize || "team member"
    mail(to: @user.email, subject: "You've been invited to join #{@studio.name} on StudioFlow")
  end

  # Sent when a godmode user creates a new moderator account.
  def moderator_welcome
    @user               = params[:user]
    @plaintext_password = params[:plaintext_password]
    @login_url          = "#{web_app_base_url}/signin"

    mail(to: @user.email, subject: "You've been added as a StudioFlow Moderator")
  end
end
