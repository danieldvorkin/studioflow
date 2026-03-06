module Api
  module V1
    class MeController < BaseController
      # GET /api/v1/me
      def show
        user   = current_user
        studio = current_studio

        render json: {
          user: {
            id:         user.id,
            email:      user.email,
            name:       user.name,
            role:       user.role,
            role_name:  user.role_name,
            avatar_url: user.avatar_url,
            active:     user.active,
            studio_id:  user.studio_id
          },
          studio: {
            id:   studio.id,
            name: studio.name,
            slug: studio.slug
          },
          api_token: {
            name:         api_token.name,
            prefix:       api_token.token_prefix,
            last_used_at: api_token.last_used_at,
            created_at:   api_token.created_at
          }
        }
      end

      # GET /api/v1/studio
      def studio
        s = current_studio
        render json: {
          studio: {
            id:                      s.id,
            name:                    s.name,
            slug:                    s.slug,
            invite_code:             s.invite_code,
            onboarding_completed_at: s.onboarding_completed_at
          }
        }
      end
    end
  end
end
