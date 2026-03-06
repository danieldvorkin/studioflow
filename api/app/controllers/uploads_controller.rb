# frozen_string_literal: true

# Handles image uploads for the WYSIWYG page editor.
# Accepts a multipart POST with a `file` field (image/*)
# and returns the Active Storage blob URL as JSON.
# In production the blob is stored on S3 and the URL proxies through Rails.
class UploadsController < ApplicationController
  ALLOWED_CONTENT_TYPES = %w[image/jpeg image/png image/gif image/webp image/svg+xml].freeze
  MAX_BYTES = 10.megabytes

  def create
    user = resolve_current_user
    return render json: { error: "Not authenticated" }, status: :unauthorized unless user
    return render json: { error: "Owner access required" }, status: :forbidden unless user.owner? || user.godmode?

    file = params[:file]
    return render json: { error: "No file provided" }, status: :unprocessable_entity if file.blank?

    content_type = file.content_type.to_s
    unless ALLOWED_CONTENT_TYPES.include?(content_type)
      return render json: { error: "Unsupported file type. Allowed: #{ALLOWED_CONTENT_TYPES.join(', ')}" },
                    status: :unprocessable_entity
    end

    if file.size > MAX_BYTES
      return render json: { error: "File too large (max #{MAX_BYTES / 1.megabyte}MB)" },
                    status: :unprocessable_entity
    end

    blob = ActiveStorage::Blob.create_and_upload!(
      io:           file.tempfile,
      filename:     file.original_filename,
      content_type: content_type,
      metadata:     { studio_id: user.studio_id, uploaded_by: user.id }
    )

    url = Rails.application.routes.url_helpers.rails_blob_url(blob, host: request.base_url)
    render json: { url: url }, status: :created
  rescue => e
    Rails.logger.error("UploadsController#create error: #{e.class}: #{e.message}")
    render json: { error: "Upload failed" }, status: :internal_server_error
  end

  private

  # Same JWT resolution as GraphqlController.
  def resolve_current_user
    user = request.env["warden"]&.user(:user)
    return user if user&.active?
    return nil if user

    auth_header = request.headers["Authorization"]
    return nil unless auth_header&.start_with?("Bearer ")

    token = auth_header.split(" ", 2).last
    return nil if token.blank?

    begin
      payload =
        if defined?(Warden::JWTAuth::TokenDecoder)
          Warden::JWTAuth::TokenDecoder.new.call(token)
        else
          require "jwt"
          JWT.decode(token, Rails.application.secret_key_base, true, { algorithm: "HS256" }).first
        end

      user_id = payload["sub"] || payload["user_id"]
      user = User.find_by(id: user_id)
      user&.active? ? user : nil
    rescue => e
      Rails.logger.warn("UploadsController.resolve_current_user JWT decode failed: #{e.class}: #{e.message}")
      nil
    end
  end
end
