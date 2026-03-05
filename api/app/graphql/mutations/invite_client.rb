# frozen_string_literal: true

module Mutations
  class InviteClient < BaseMutation
    argument :email, String, required: true
    argument :name,  String, required: false

    field :invitation,  Types::ClientInvitationType, null: true
    field :signup_url,  String,                      null: true
    field :errors,      [ String ],                  null: false

    def resolve(email:, name: nil)
      current_user = context[:current_user]
      # Use UserPolicy#invite? since inviting a client is a user-invitation operation
      # (owner, staff, and moderators may invite clients; instructors may not)
      unless current_user && Pundit.policy!(current_user, User).invite?
        raise GraphQL::ExecutionError, "Not authorized"
      end

      normalized = email.to_s.strip.downcase
      return { invitation: nil, signup_url: nil, errors: [ "Email is required" ] } if normalized.blank?

      studio = current_user.studio

      # ── Subscription client limit check ────────────────────────────────────
      unless current_user.godmode?
        sub = StudioSubscription.find_by(studio_id: studio.id)
        if sub.present? && sub.active?
          current_count = studio.clients.count
          unless sub.within_client_limit?(current_count)
            limit = sub.max_clients
            tier  = sub.tier_label
            return {
              invitation: nil,
              signup_url: nil,
              errors: [
                "Your #{tier} plan allows up to #{limit} active clients. " \
                "Upgrade your plan to invite more clients."
              ]
            }
          end
        end
      end

      # Reuse a pending invitation for the same email/studio, or create a new one
      invitation = studio.client_invitations.pending.find_by(email: normalized)
      invitation ||= studio.client_invitations.build(
        email:      normalized,
        name:       name.presence,
        invited_by: current_user
      )
      invitation.name = name.presence if name.present?

      unless invitation.save
        return { invitation: nil, signup_url: nil, errors: invitation.errors.full_messages }
      end

      web_url  = ENV.fetch("WEB_APP_URL", "http://localhost:5173")
      signup_url = "#{web_url}/signup/client?token=#{invitation.token}"

      # Send invitation email in all non-test environments
      unless Rails.env.test?
        ClientInvitationMailer.with(
          invitation: invitation,
          signup_url: signup_url
        ).invite.deliver_later
      end

      { invitation: invitation, signup_url: signup_url, errors: [] }
    end
  end
end
