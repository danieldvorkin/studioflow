FactoryBot.define do
  factory :instructor_client_block do
    transient do
      tenant_studio { association(:studio) }
    end

    instructor { association(:user, :instructor, studio: tenant_studio) }
    client { association(:client, studio: tenant_studio) }
    studio { tenant_studio }
  end
end
