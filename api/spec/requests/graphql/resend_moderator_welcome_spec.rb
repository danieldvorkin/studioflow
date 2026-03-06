# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'ResendModeratorWelcome mutation', type: :request do
  let(:godmode_studio) { create(:studio) }
  let(:god) { create(:user, email: 'dvorkin212@gmail.com', studio: godmode_studio) }
  let(:moderator) { create(:user, :moderator, email: 'mod@studioflow.io', studio: godmode_studio) }

  let(:mutation) do
    <<~GRAPHQL
      mutation ResendModeratorWelcome($userId: ID!) {
        resendModeratorWelcome(input: { userId: $userId }) {
          user { id email }
          errors
        }
      }
    GRAPHQL
  end

  context 'as godmode user' do
    before { sign_in(god) }

    it 'returns the moderator user and no errors' do
      json = graphql_post(query: mutation, variables: { userId: moderator.id })

      expect(json['errors']).to be_nil
      payload = json.dig('data', 'resendModeratorWelcome')
      expect(payload['errors']).to eq([])
      expect(payload.dig('user', 'email')).to eq('mod@studioflow.io')
    end

    it 'enqueues a moderator_welcome email' do
      expect {
        graphql_post(query: mutation, variables: { userId: moderator.id })
      }.to have_enqueued_mail(UserMailer, :moderator_welcome).once
    end

    it 'resets the moderator password to a new value' do
      old_encrypted = moderator.encrypted_password

      graphql_post(query: mutation, variables: { userId: moderator.id })

      expect(moderator.reload.encrypted_password).not_to eq(old_encrypted)
    end

    it 'returns an error when user is not found' do
      json = graphql_post(query: mutation, variables: { userId: '00000000' })

      payload = json.dig('data', 'resendModeratorWelcome')
      expect(payload['user']).to be_nil
      expect(payload['errors']).to include('Moderator not found')
    end

    it 'returns an error when user exists but is not a moderator' do
      owner = create(:user, :owner, studio: godmode_studio)

      json = graphql_post(query: mutation, variables: { userId: owner.id })

      payload = json.dig('data', 'resendModeratorWelcome')
      expect(payload['user']).to be_nil
      expect(payload['errors']).to include('Moderator not found')
    end

    it 'does not enqueue an email when the moderator is not found' do
      expect {
        graphql_post(query: mutation, variables: { userId: '00000000' })
      }.not_to have_enqueued_mail(UserMailer, :moderator_welcome)
    end
  end

  context 'as a non-godmode owner' do
    let(:owner) { create(:user, :owner, studio: godmode_studio) }
    before { sign_in(owner) }

    it 'rejects with an authorization error' do
      json = graphql_post(query: mutation, variables: { userId: moderator.id })

      expect(json.dig('data', 'resendModeratorWelcome')).to be_nil
      expect(json['errors']).to be_present
    end

    it 'does not enqueue an email' do
      expect {
        graphql_post(query: mutation, variables: { userId: moderator.id })
      }.not_to have_enqueued_mail(UserMailer, :moderator_welcome)
    end
  end

  context 'when unauthenticated' do
    it 'rejects the mutation' do
      json = graphql_post(query: mutation, variables: { userId: moderator.id })

      expect(json.dig('data', 'resendModeratorWelcome')).to be_nil
      expect(json['errors']).to be_present
    end
  end
end
