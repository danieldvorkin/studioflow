# frozen_string_literal: true

namespace :studio do
  desc "Associate an existing user to a studio by slug. Usage: rake studio:associate_user STUDIO_SLUG=main USER_EMAIL=you@example.com"
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

  desc "Create or update an owner account for a studio. Usage: rake studio:create_owner STUDIO_SLUG=main OWNER_EMAIL=owner@studioflow.io OWNER_PASSWORD=secret OWNER_NAME='Studio Owner'"
  task create_owner: :environment do
    slug     = ENV.fetch("STUDIO_SLUG")    { abort "STUDIO_SLUG is required" }
    email    = ENV.fetch("OWNER_EMAIL")    { abort "OWNER_EMAIL is required" }
    password = ENV.fetch("OWNER_PASSWORD") { abort "OWNER_PASSWORD is required" }
    name     = ENV.fetch("OWNER_NAME", "Studio Owner")

    studio = Studio.find_by!(slug: slug)
    user   = User.find_or_initialize_by(email: email)

    user.studio   = studio
    user.name     = name
    user.role     = User::ROLES.fetch(:owner)

    if user.new_record?
      user.password              = password
      user.password_confirmation = password
    end

    user.save!
    puts "✅ Owner '#{user.email}' #{user.previously_new_record? ? 'created' : 'updated'} for Studio '#{studio.name}'"
  end
end
