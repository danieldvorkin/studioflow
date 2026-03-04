# frozen_string_literal: true

namespace :studio do
  desc "Associate an existing user to a studio by slug. Usage: rake studio:associate_user STUDIO_SLUG=studioflow USER_EMAIL=dvorkin212@gmail.com"
  task associate_user: :environment do
    slug  = ENV.fetch("STUDIO_SLUG") { abort "STUDIO_SLUG is required" }
    email = ENV.fetch("USER_EMAIL")  { abort "USER_EMAIL is required" }

    studio = Studio.find_by!(slug: slug)
    user   = User.find_by!(email: email)

    if user.studio_id == studio.id
      puts "#{user.email} is already associated with Studio '#{studio.name}' (id=#{studio.id})"
    else
      user.update!(studio: studio)
      puts "✅ Associated #{user.email} → Studio '#{studio.name}' (id=#{studio.id})"
    end
  end
end
