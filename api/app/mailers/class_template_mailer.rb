class ClassTemplateMailer < ApplicationMailer
  # Sent to studio owners when an instructor submits a new class for approval.
  def pending_approval
    @template  = params[:template]
    @owner     = params[:owner]
    @review_url = "#{web_app_base_url}/templates"
    mail(to: @owner.email, subject: "New class pending approval: \"#{@template.title}\"")
  end

  # Sent to the instructor when their class is approved.
  def class_approved
    @template    = params[:template]
    @instructor  = params[:instructor]
    @sessions_url = "#{web_app_base_url}/templates/#{@template.id}/sessions"
    mail(to: @instructor.email, subject: "Your class \"#{@template.title}\" has been approved 🎉")
  end

  # Sent to the instructor when their class is rejected (set back to pending).
  def class_rejected
    @template   = params[:template]
    @instructor = params[:instructor]
    mail(to: @instructor.email, subject: "Update on your class submission: \"#{@template.title}\"")
  end
end
