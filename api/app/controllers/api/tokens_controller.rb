# JWT-authenticated controller for owners to manage their API tokens.
# Uses the same Devise-JWT header that the web app and GraphQL use.
module Api
  class TokensController < ApplicationController
    before_action :authenticate_jwt_user!
    before_action :require_owner_or_godmode!

    # GET /api/tokens
    def index
      tokens = current_user.studio.api_tokens.where(user_id: current_user.id).order(created_at: :desc)
      render json: { api_tokens: tokens.map { |t| serialize_token(t) } }
    end

    # POST /api/tokens
    def create
      name = params[:name].to_s.strip
      return render json: { error: "Name is required" }, status: :unprocessable_entity if name.blank?

      token_record, raw = ApiToken.generate!(
        user:   current_user,
        studio: current_user.studio,
        name:   name
      )

      render json: {
        api_token: serialize_token(token_record).merge(raw_token: raw,
                                                      warning: "Copy this token now. It will not be shown again.")
      }, status: :created
    end

    # DELETE /api/tokens/:id
    def destroy
      token = current_user.studio.api_tokens.find_by(id: params[:id], user_id: current_user.id)
      return render json: { error: "Not found" }, status: :not_found unless token

      token.revoke!
      render json: { message: "Token revoked", api_token: serialize_token(token) }
    end

    private

    def authenticate_jwt_user!
      auth_header = request.headers["Authorization"]
      unless auth_header&.start_with?("Bearer ")
        return render json: { error: "Unauthorized" }, status: :unauthorized
      end

      raw_jwt = auth_header.split(" ", 2).last
      payload =
        if defined?(Warden::JWTAuth::TokenDecoder)
          Warden::JWTAuth::TokenDecoder.new.call(raw_jwt)
        else
          require "jwt"
          JWT.decode(raw_jwt, Rails.application.secret_key_base, true, algorithm: "HS256").first
        end

      user_id = payload["sub"] || payload["user_id"]
      @current_user = User.find_by(id: user_id)
      render json: { error: "Unauthorized" }, status: :unauthorized unless @current_user
    rescue => e
      Rails.logger.warn("Api::TokensController JWT error: #{e.class}: #{e.message}")
      render json: { error: "Unauthorized" }, status: :unauthorized
    end

    def require_owner_or_godmode!
      unless current_user&.owner? || current_user&.godmode?
        render json: { error: "Forbidden — owner access required" }, status: :forbidden
      end
    end

    def current_user
      @current_user
    end

    def serialize_token(t)
      {
        id:           t.id,
        name:         t.name,
        prefix:       t.token_prefix,
        active:       t.active?,
        revoked_at:   t.revoked_at,
        expires_at:   t.expires_at,
        last_used_at: t.last_used_at,
        created_at:   t.created_at
      }
    end
  end
end
