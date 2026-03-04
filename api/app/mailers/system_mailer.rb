class SystemMailer < ApplicationMailer
  def test_email(to:, sent_at: Time.current)
    @sent_at = sent_at
    mail(to: to, subject: "StudioFlow — email server test")
  end
end
