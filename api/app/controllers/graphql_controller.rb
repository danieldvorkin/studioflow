# frozen_string_literal: true

class GraphqlController < ApplicationController
  # If accessing from outside this domain, nullify the session
  # This allows for outside API access while preventing CSRF attacks,
  # but you'll have to authenticate your user separately
  # protect_from_forgery with: :null_session

  def execute
    variables = prepare_variables(params[:variables])
    query = params[:query]
    operation_name = params[:operationName]
    context = {
      # Expose the currently authenticated user (if any) to GraphQL resolvers
      current_user: resolve_current_user
    }
    # Log Authorization header for debugging auth issues
    Rails.logger.info("GraphqlController Authorization header: #{request.headers['Authorization']}")
    result = ApiSchema.execute(query, variables: variables, context: context, operation_name: operation_name)
    render json: result
  rescue StandardError => e
    raise e unless Rails.env.development?
    handle_error_in_development(e)
  end

  private

  # Handle variables in form data, JSON body, or a blank value
  def prepare_variables(variables_param)
    case variables_param
    when String
      if variables_param.present?
        JSON.parse(variables_param) || {}
      else
        {}
      end
    when Hash
      variables_param
    when ActionController::Parameters
      variables_param.to_unsafe_hash # GraphQL-Ruby will validate name and type of incoming variables.
    when nil
      {}
    else
      raise ArgumentError, "Unexpected parameter: #{variables_param}"
    end
  end

  # Resolve current_user either from Warden (Devise) or by manually decoding the JWT
  # from the Authorization header. This ensures GraphQL has a user even when the
  # Warden JWT strategy does not populate request.env['warden'].
  def resolve_current_user
    user = request.env["warden"]&.user(:user)
    return user if user&.active?
    return nil if user # inactive via session

    auth_header = request.headers["Authorization"]
    return nil unless auth_header&.start_with?("Bearer ")

    token = auth_header.split(" ", 2).last
    return nil if token.blank?

    begin
      # Prefer Warden::JWTAuth decoder if available, it knows Devise's secret/algorithm
      if defined?(Warden::JWTAuth::TokenDecoder)
        payload = Warden::JWTAuth::TokenDecoder.new.call(token)
      else
        require "jwt"
        payload, = JWT.decode(token, Rails.application.secret_key_base, true, { algorithm: "HS256" })
      end
      user_id = payload["sub"] || payload["user_id"]
      user = User.find_by(id: user_id)
      user&.active? ? user : nil
    rescue => e
      Rails.logger.warn("GraphqlController.resolve_current_user JWT decode failed: #{e.class}: #{e.message}")
      nil
    end
  end

  def handle_error_in_development(e)
    logger.error e.message
    logger.error e.backtrace.join("\n")

    render json: { errors: [ { message: e.message, backtrace: e.backtrace } ], data: {} }, status: 500
  end
end
