# frozen_string_literal: true

class ClientInvitationMailer < ApplicationMailer
  default from: "no-reply@studioflow.app"

  def invite
    @invitation  = params[:invitation]
    @studio      = @invitation.studio
    @invited_by  = @invitation.invited_by
    @signup_url  = params[:signup_url]

    mail(
      to:      @invitation.email,
      subject: "#{@studio.name} has invited you to join their studio"
    )
  end
end
