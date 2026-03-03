module Mutations
  class SignUp < BaseMutation
    argument :email, String, required: true
    argument :password, String, required: true
    argument :name, String, required: false
    argument :account_type, Types::AccountTypeEnum, required: true
    argument :studio_invite_code, String, required: false
    argument :invitation_token, String, required: false

    field :user, Types::UserType, null: true
    field :errors, [ String ], null: false

    def resolve(email:, password:, name: nil, account_type:, studio_invite_code: nil, invitation_token: nil)
      role = case account_type
      when "OWNER" then ::User::ROLES[:owner]
      when "CLIENT" then ::User::ROLES[:client]
      else nil
      end

      # Look up invitation for client signups
      invitation = if account_type == "CLIENT" && invitation_token.present?
        ClientInvitation.find_by(token: invitation_token.to_s.strip)
      end

      studio = case account_type
      when "OWNER"
        if studio_invite_code.present?
          Studio.find_by(invite_code: studio_invite_code.to_s.strip)
        else
          Studio.create!(
            name: name.presence || email.to_s.split("@").first.to_s.titleize,
            slug: "studio-#{SecureRandom.hex(4)}"
          )
        end
      when "CLIENT"
        if invitation&.pending?
          invitation.studio
        else
          Studio.find_by(slug: "demo") || Studio.first || Studio.create!(name: "Demo Studio", slug: "demo")
        end
      end

      if account_type == "OWNER" && studio.nil?
        return { user: nil, errors: [ "Studio code not found" ] }
      end

      user = ::User.new(
        email: email,
        password: password,
        password_confirmation: password,
        name: name.presence || invitation&.name,
        role: role,
        studio: studio,
      )

      if user.save
        if account_type == "CLIENT"
          client = ::Client.find_or_initialize_by(user_id: user.id)
          client.studio_id ||= user.studio_id
          client.email ||= user.email
          client.name ||= user.name.presence || user.email.to_s.split("@").first
          client.save!

          invitation&.accept! if invitation&.pending?
        end

        { user: user, errors: [] }
      else
        { user: nil, errors: user.errors.full_messages }
      end
    end
  end
end
