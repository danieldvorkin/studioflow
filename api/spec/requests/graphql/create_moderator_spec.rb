require 'rails_helper'

RSpec.describe 'CreateModerator mutation', type: :request do
  let(:godmode_studio) { create(:studio) }
  let(:god) { create(:user, email: 'dvorkin212@gmail.com', studio: godmode_studio) }

  let(:mutation) do
    <<~GRAPHQL
      mutation CreateModerator($email: String!, $name: String) {
        createModerator(input: { email: $email, name: $name }) {
          user { id email name roleName active }
          plaintextPassword
          errors
        }
      }
    GRAPHQL
  end

  let(:moderators_query) do
    <<~GRAPHQL
      query {
        moderators { id email name roleName active }
      }
    GRAPHQL
  end

  context 'as godmode user' do
    before { sign_in(god) }

    it 'creates a moderator and returns a plaintext password' do
      json = graphql_post(
        query: mutation,
        variables: { email: 'mod@studioflow.io', name: 'Platform Mod' }
      )

      expect(json['errors']).to be_nil
      payload = json.dig('data', 'createModerator')
      expect(payload['errors']).to eq([])
      expect(payload.dig('user', 'email')).to eq('mod@studioflow.io')
      expect(payload.dig('user', 'name')).to eq('Platform Mod')
      expect(payload.dig('user', 'roleName')).to eq('moderator')
      expect(payload.dig('user', 'active')).to eq(true)
      expect(payload['plaintextPassword']).to be_present
    end

    it 'enqueues a moderator_welcome email after successful creation' do
      expect {
        graphql_post(query: mutation, variables: { email: 'newmod@studioflow.io', name: 'New Mod' })
      }.to have_enqueued_mail(UserMailer, :moderator_welcome).once
    end

    it 'does not send the welcome email when creation fails' do
      create(:user, email: 'taken@studioflow.io', studio: godmode_studio)

      expect {
        graphql_post(query: mutation, variables: { email: 'taken@studioflow.io' })
      }.not_to have_enqueued_mail(UserMailer, :moderator_welcome)
    end

    it 'persists the user with role moderator in the database' do
      graphql_post(query: mutation, variables: { email: 'newmod@studioflow.io' })

      user = User.find_by!(email: 'newmod@studioflow.io')
      expect(user.role).to eq(User::ROLES[:moderator])
      expect(user.moderator?).to eq(true)
    end

    it 'generates a valid password for the new moderator' do
      json = graphql_post(query: mutation, variables: { email: 'secmod@studioflow.io' })

      password = json.dig('data', 'createModerator', 'plaintextPassword')
      user = User.find_by!(email: 'secmod@studioflow.io')
      expect(user.valid_password?(password)).to eq(true)
    end

    it 'auto-generates a display name from email when name is omitted' do
      json = graphql_post(query: mutation, variables: { email: 'jane@studioflow.io' })

      payload = json.dig('data', 'createModerator')
      expect(payload['errors']).to eq([])
      expect(payload.dig('user', 'name')).to eq('Jane')
    end

    it 'returns an error when the email already exists' do
      create(:user, email: 'taken@studioflow.io', studio: godmode_studio)

      json = graphql_post(query: mutation, variables: { email: 'taken@studioflow.io' })

      payload = json.dig('data', 'createModerator')
      expect(payload['user']).to be_nil
      expect(payload['plaintextPassword']).to be_nil
      expect(payload['errors']).to include('A user with that email already exists')
    end

    it 'returns an error when email is blank' do
      json = graphql_post(query: mutation, variables: { email: '   ' })

      payload = json.dig('data', 'createModerator')
      expect(payload['user']).to be_nil
      expect(payload['errors']).to include('Email is required')
    end

    it 'lists moderators via the moderators query' do
      create(:user, :moderator, email: 'alpha@studioflow.io', studio: godmode_studio, name: 'Alpha')
      create(:user, :moderator, email: 'beta@studioflow.io', studio: godmode_studio, name: 'Beta')
      create(:user, :owner, email: 'owner@studio.io', studio: godmode_studio)

      json = graphql_post(query: moderators_query)

      expect(json['errors']).to be_nil
      mods = json.dig('data', 'moderators')
      emails = mods.map { |m| m['email'] }
      expect(emails).to include('alpha@studioflow.io', 'beta@studioflow.io')
      expect(emails).not_to include('owner@studio.io')
      expect(mods.map { |m| m['roleName'] }.uniq).to eq([ 'moderator' ])
    end
  end

  context 'as a non-godmode owner' do
    let(:owner) { create(:user, :owner, studio: godmode_studio) }
    before { sign_in(owner) }

    it 'rejects createModerator with an authorization error' do
      json = graphql_post(query: mutation, variables: { email: 'hack@evil.io' })

      expect(json.dig('data', 'createModerator')).to be_nil
      expect(json['errors']).to be_present
    end

    it 'rejects the moderators query' do
      json = graphql_post(query: moderators_query)

      expect(json.dig('data', 'moderators')).to be_nil
      expect(json['errors']).to be_present
    end
  end

  context 'when unauthenticated' do
    it 'rejects createModerator' do
      json = graphql_post(query: mutation, variables: { email: 'anon@evil.io' })

      expect(json.dig('data', 'createModerator')).to be_nil
      expect(json['errors']).to be_present
    end
  end
end
