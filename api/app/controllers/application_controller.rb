class ApplicationController < ActionController::API
	include Pundit::Authorization

	rescue_from Pundit::NotAuthorizedError do |_exception|
		render json: { error: 'Not authorized' }, status: :forbidden
	end
end
