require 'rails_helper'

RSpec.describe 'UpdateProfile', type: :request do
  let(:user) { create(:user, password: 'password123', password_confirmation: 'password123') }

  let(:mutation) do
    <<~GRAPHQL
      mutation($name: String, $email: String, $currentPassword: String, $password: String, $passwordConfirmation: String) {
        updateProfile(input: { name: $name, email: $email, currentPassword: $currentPassword, password: $password, passwordConfirmation: $passwordConfirmation }) {
          user { id name email }
          errors
        }
      }
    GRAPHQL
  end

  before { sign_in(user) }

  it 'allows updating non-sensitive fields without current password' do
    json = graphql_post(query: mutation, variables: { name: 'New Name' })
    payload = json.dig('data', 'updateProfile')
    expect(payload['errors']).to eq([])
    expect(user.reload.name).to eq('New Name')
  end

  it 'requires current password when changing email' do
    json = graphql_post(query: mutation, variables: { email: 'new@example.com' })
    payload = json.dig('data', 'updateProfile')
    expect(payload['user']).to be_nil
    expect(payload['errors']).to include('Current password is required')
  end

  it 'rejects incorrect current password' do
    json = graphql_post(query: mutation, variables: { email: 'new@example.com', currentPassword: 'wrong' })
    payload = json.dig('data', 'updateProfile')
    expect(payload['user']).to be_nil
    expect(payload['errors']).to include('Current password is incorrect')
  end
end
