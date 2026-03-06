# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'ToggleModeratorActive mutation', type: :request do
  let(:godmode_studio) { create(:studio) }
  let(:god) { create(:user, email: 'dvorkin212@gmail.com', studio: godmode_studio) }
  let(:moderator) { create(:user, :moderator, email: 'mod@studioflow.io', studio: godmode_studio, active: true) }

  let(:mutation) do
    <<~GRAPHQL
      mutation ToggleModeratorActive($userId: ID!, $active: Boolean!) {
        toggleModeratorActive(input: { userId: $userId, active: $active }) {
          user { id email active }
          errors
        }
      }
    GRAPHQL
  end

  context 'as godmode user' do
    before { sign_in(god) }

    it 'deactivates an active moderator' do
      json = graphql_post(query: mutation, variables: { userId: moderator.id, active: false })

      expect(json['errors']).to be_nil
      payload = json.dig('data', 'toggleModeratorActive')
      expect(payload['errors']).to eq([])
      expect(payload.dig('user', 'active')).to eq(false)
      expect(moderator.reload.active).to eq(false)
    end

    it 'reactivates an inactive moderator' do
      moderator.update!(active: false)

      json = graphql_post(query: mutation, variables: { userId: moderator.id, active: true })

      payload = json.dig('data', 'toggleModeratorActive')
      expect(payload['errors']).to eq([])
      expect(payload.dig('user', 'active')).to eq(true)
      expect(moderator.reload.active).to eq(true)
    end

    it 'returns an error when user is not found' do
      json = graphql_post(query: mutation, variables: { userId: '00000000', active: false })

      payload = json.dig('data', 'toggleModeratorActive')
      expect(payload['user']).to be_nil
      expect(payload['errors']).to include('Moderator not found')
    end

    it 'returns an error when user is not a moderator' do
      owner = create(:user, :owner, studio: godmode_studio)

      json = graphql_post(query: mutation, variables: { userId: owner.id, active: false })

      payload = json.dig('data', 'toggleModeratorActive')
      expect(payload['user']).to be_nil
      expect(payload['errors']).to include('Moderator not found')
    end
  end

  context 'as a non-godmode owner' do
    let(:owner) { create(:user, :owner, studio: godmode_studio) }
    before { sign_in(owner) }

    it 'rejects with an authorization error' do
      json = graphql_post(query: mutation, variables: { userId: moderator.id, active: false })

      expect(json.dig('data', 'toggleModeratorActive')).to be_nil
      expect(json['errors']).to be_present
    end
  end

  context 'when unauthenticated' do
    it 'rejects the mutation' do
      json = graphql_post(query: mutation, variables: { userId: moderator.id, active: false })

      expect(json.dig('data', 'toggleModeratorActive')).to be_nil
      expect(json['errors']).to be_present
    end
  end
end

RSpec.describe 'Inactive user access enforcement', type: :request do
  let(:studio) { create(:studio) }

  let(:current_user_query) do
    <<~GRAPHQL
      query { currentUser { id email active } }
    GRAPHQL
  end

  let(:sign_in_mutation) do
    <<~GRAPHQL
      mutation SignIn($email: String!, $password: String!) {
        signIn(input: { email: $email, password: $password }) {
          token
          user { id email active }
          errors
        }
      }
    GRAPHQL
  end

  context 'deactivated moderator' do
    let(:moderator) do
      create(:user, :moderator, email: 'inactive@studioflow.io', studio: studio, active: false)
    end

    it 'cannot sign in — receives a deactivated error' do
      # give the moderator a known password
      moderator.update!(password: 'Password1!', password_confirmation: 'Password1!')

      json = graphql_post(
        query: sign_in_mutation,
        variables: { email: 'inactive@studioflow.io', password: 'Password1!' }
      )

      payload = json.dig('data', 'signIn')
      expect(payload['token']).to be_nil
      expect(payload['user']).to be_nil
      expect(payload['errors'].join).to match(/deactivated/i)
    end

    it 'is treated as unauthenticated even with a valid session token' do
      sign_in(moderator)

      json = graphql_post(query: current_user_query)

      # A deactivated user's session is ignored; currentUser returns nil
      expect(json.dig('data', 'currentUser')).to be_nil
    end
  end
end
