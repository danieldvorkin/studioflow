module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_api_token!

      private

      def authenticate_api_token!
        raw = request.headers["Authorization"].to_s.delete_prefix("Bearer ").strip
        if raw.blank?
          return render json: { error: "Missing API token" }, status: :unauthorized
        end

        @api_token = ApiToken.authenticate!(raw)
        if @api_token.nil?
          return render json: { error: "Invalid or revoked API token" }, status: :unauthorized
        end

        @current_user  = @api_token.user
        @current_studio = @api_token.studio
      end

      attr_reader :current_user, :current_studio, :api_token
    end
  end
end
