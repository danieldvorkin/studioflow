require 'rails_helper'

RSpec.describe 'Invite user', type: :request do
  let(:studio) { create(:studio) }
  let(:owner) { create(:user, :owner, studio: studio) }
  let(:staff) { create(:user, :staff, studio: studio) }

  let(:mutation) do
    <<~GRAPHQL
      mutation($email: String!, $name: String, $role: Int!) {
        inviteUser(input: { email: $email, name: $name, role: $role }) {
          user { id email roleName }
          errors
        }
      }
    GRAPHQL
  end

  it 'allows owner to invite staff into their studio' do
    sign_in(owner)

    json = graphql_post(query: mutation, variables: { email: 'new.staff@example.com', name: 'New Staff', role: User::ROLES[:staff] })
    expect(json['errors']).to be_nil

    payload = json.dig('data', 'inviteUser')
    expect(payload['errors']).to eq([])
    expect(payload.dig('user', 'email')).to eq('new.staff@example.com')
    expect(payload.dig('user', 'roleName')).to eq('staff')

    created = User.find_by!(email: 'new.staff@example.com')
    expect(created.studio_id).to eq(studio.id)
  end

  it 'rejects non-owner' do
    sign_in(staff)

    json = graphql_post(query: mutation, variables: { email: 'x@example.com', role: User::ROLES[:staff] })
    expect(json.dig('data', 'inviteUser')).to be_nil
    expect(json['errors']).to be_present
  end
end
