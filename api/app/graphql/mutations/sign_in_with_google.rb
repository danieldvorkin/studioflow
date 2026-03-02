module Mutations
  class SignInWithGoogle < BaseMutation
    argument :code, String, required: false
    argument :access_token, String, required: false

    field :token, String, null: true
    field :user, Types::UserType, null: true
    field :errors, [ String ], null: false

    def resolve(code: nil, access_token: nil)
      client_id = ENV["GOOGLE_CLIENT_ID"] || ENV["VITE_GOOGLE_CLIENT_ID"]
      client_secret = ENV["GOOGLE_CLIENT_SECRET"]
      redirect_uri = ENV["GOOGLE_REDIRECT_URI"] || "postmessage"

      if client_id.blank?
        return { token: nil, user: nil, errors: [ "GOOGLE_CLIENT_ID is not configured" ] }
      end

      if code.blank? && access_token.blank?
        return { token: nil, user: nil, errors: [ "Provide code or accessToken" ] }
      end

      payload = nil

      if access_token.present?
        payload = fetch_google_userinfo!(access_token: access_token)
      else
        if client_secret.blank?
          return { token: nil, user: nil, errors: [ "GOOGLE_CLIENT_SECRET is not configured" ] }
        end

        id_token = exchange_google_code_for_id_token!(
          code: code,
          client_id: client_id,
          client_secret: client_secret,
          redirect_uri: redirect_uri
        )

        validator = GoogleIDToken::Validator.new
        begin
          payload = validator.check(id_token, client_id)
        rescue GoogleIDToken::ValidationError => e
          Rails.logger.warn("Google id_token validation failed: #{e.message}")
          return { token: nil, user: nil, errors: [ "Invalid Google token: #{e.message}" ] }
        end
      end

      email = payload["email"]
      name = payload["name"] || payload["given_name"]
      picture = payload["picture"]

      user = User.find_or_initialize_by(email: email)
      if user.new_record?
        demo_studio = Studio.find_by(slug: "demo") || Studio.first
        user.studio ||= demo_studio if demo_studio.present?

        user.name = name
        user.avatar_url = picture
        random_password = Devise.friendly_token[0, 20]
        user.password = random_password
        user.password_confirmation = random_password
        user.save!
      else
        # update avatar if present
        if picture.present? && user.avatar_url != picture
          user.update(avatar_url: picture)
        end
      end

      token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
      { token: token, user: user, errors: [] }
    end

    private

    def exchange_google_code_for_id_token!(code:, client_id:, client_secret:, redirect_uri:)
      require "net/http"
      require "json"

      uri = URI("https://oauth2.googleapis.com/token")
      req = Net::HTTP::Post.new(uri)
      req["Content-Type"] = "application/x-www-form-urlencoded"
      req.body = URI.encode_www_form(
        code: code,
        client_id: client_id,
        client_secret: client_secret,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code"
      )

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      res = http.request(req)

      parsed = begin
        JSON.parse(res.body)
      rescue JSON::ParserError
        {}
      end

      unless res.is_a?(Net::HTTPSuccess)
        error = parsed["error"] || "token_exchange_failed"
        description = parsed["error_description"]
        Rails.logger.warn("Google token exchange failed: status=#{res.code} error=#{error} description=#{description}")
        raise StandardError, "Google token exchange failed"
      end

      id_token = parsed["id_token"]
      raise StandardError, "No id_token returned by Google" if id_token.blank?
      id_token
    rescue => e
      Rails.logger.warn("Google token exchange exception: #{e.class}: #{e.message}")
      raise
    end

    def fetch_google_userinfo!(access_token:)
      require "net/http"
      require "json"

      uri = URI("https://www.googleapis.com/oauth2/v3/userinfo")
      req = Net::HTTP::Get.new(uri)
      req["Authorization"] = "Bearer #{access_token}"

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      res = http.request(req)

      parsed = begin
        JSON.parse(res.body)
      rescue JSON::ParserError
        {}
      end

      unless res.is_a?(Net::HTTPSuccess)
        error = parsed["error"] || "userinfo_failed"
        Rails.logger.warn("Google userinfo failed: status=#{res.code} error=#{error}")
        raise StandardError, "Google userinfo failed"
      end

      if parsed["email"].blank?
        raise StandardError, "Google userinfo did not return email"
      end

      parsed
    rescue => e
      Rails.logger.warn("Google userinfo exception: #{e.class}: #{e.message}")
      raise
    end
  end
end
