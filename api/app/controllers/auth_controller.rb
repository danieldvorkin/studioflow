class AuthController < ApplicationController
  # POST /auth/google
  # Accept an idToken from the iOS Google Sign-In SDK and return a JWT + user payload.
  def google
    id_token_str  = params[:id_token]  || params[:idToken]
    access_token  = params[:access_token] || params[:accessToken]

    web_client_id = ENV["GOOGLE_CLIENT_ID"] || ENV["VITE_GOOGLE_CLIENT_ID"]
    ios_client_id = ENV["GOOGLE_IOS_CLIENT_ID"]
    accepted_audiences = [ web_client_id, ios_client_id ].compact

    if accepted_audiences.empty?
      return render json: { errors: [ "GOOGLE_CLIENT_ID is not configured" ] }, status: :unprocessable_entity
    end

    payload =
      if id_token_str.present?
        validate_id_token!(id_token_str, accepted_audiences)
      elsif access_token.present?
        fetch_google_userinfo!(access_token)
      else
        return render json: { errors: [ "Provide id_token or access_token" ] }, status: :unprocessable_entity
      end

    if payload.is_a?(Hash) && payload[:error]
      return render json: { errors: [ payload[:error] ] }, status: :unprocessable_entity
    end

    email   = payload["email"]
    name    = payload["name"] || payload["given_name"]
    picture = payload["picture"]

    user = User.find_or_initialize_by(email: email)
    if user.new_record?
      demo_studio = Studio.find_by(slug: "demo") || Studio.first
      user.studio ||= demo_studio if demo_studio.present?
      user.name     = name
      user.avatar_url = picture
      random_password = Devise.friendly_token[0, 20]
      user.password = random_password
      user.password_confirmation = random_password
      user.save!
    elsif picture.present? && user.avatar_url != picture
      user.update(avatar_url: picture)
    end

    token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first

    studio = user.studio
    client = Client.find_by(user_id: user.id, studio_id: user.studio_id)

    active_membership = client&.client_memberships&.find_by(status: "active")
    upcoming_bookings_count = client
      .then { |c| c ? Booking.where(client_id: c.id, archived: false).where(status: [ 0, 1 ]).joins(:class_session).where("class_sessions.start_time > ?", Time.current).count : 0 }
    bundle_credits = client
      .then { |c| c ? BundlePurchase.where(client_id: c.id, status: "succeeded").where("credits_remaining > 0").sum(:credits_remaining) : 0 }

    render json: {
      token: token,
      user: {
        id:                                  user.id,
        email:                               user.email,
        name:                                user.name,
        avatar_url:                          user.avatar_url,
        role:                                user.role,
        role_name:                           user.role_name,
        studio_id:                           user.studio_id,
        godmode:                             user.godmode?,
        active:                              user.active,
        available_for_sessions:              user.available_for_sessions,
        stripe_connect_onboarding_completed: user.stripe_connect_onboarding_completed
      },
      studio: studio ? {
        id:                      studio.id,
        name:                    studio.name,
        slug:                    studio.slug,
        invite_code:             studio.invite_code,
        onboarding_completed_at: studio.onboarding_completed_at
      } : nil,
      client_summary: client ? {
        id:                      client.id,
        active_membership_name:  active_membership&.membership_plan&.name,
        active_membership_status: active_membership&.status,
        upcoming_bookings_count: upcoming_bookings_count,
        bundle_credits_remaining: bundle_credits
      } : nil
    }
  rescue => e
    Rails.logger.error("AuthController#google error: #{e.class}: #{e.message}")
    render json: { errors: [ "Authentication failed" ] }, status: :unprocessable_entity
  end

  private

  # GoogleIDToken::Validator#check only accepts a single audience string per call.
  # Try each registered client ID in turn; return the payload from the first that passes.
  def validate_id_token!(id_token_str, accepted_audiences)
    validator = GoogleIDToken::Validator.new
    last_error = nil
    accepted_audiences.each do |aud|
      begin
        return validator.check(id_token_str, aud)
      rescue GoogleIDToken::ValidationError => e
        last_error = e
      end
    end
    Rails.logger.warn("Google id_token validation failed for all audiences: #{last_error&.message}")
    { error: "Invalid Google token: #{last_error&.message}" }
  end

  def fetch_google_userinfo!(access_token)
    require "net/http"
    require "json"

    uri = URI("https://www.googleapis.com/oauth2/v3/userinfo")
    req = Net::HTTP::Get.new(uri)
    req["Authorization"] = "Bearer #{access_token}"

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    res = http.request(req)

    parsed = JSON.parse(res.body) rescue {}

    unless res.is_a?(Net::HTTPSuccess) && parsed["email"].present?
      return { error: "Google userinfo failed" }
    end

    parsed
  end
end
