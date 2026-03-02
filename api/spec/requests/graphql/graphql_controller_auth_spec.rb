require 'rails_helper'

RSpec.describe 'GraphqlController auth header', type: :request do
  let(:query) do
    <<~GRAPHQL
      query {
        currentUser { id email }
      }
    GRAPHQL
  end

  it 'resolves currentUser from Bearer JWT when not signed in via session' do
    user = create(:user)
    token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first

    post '/graphql',
         params: { query: query, variables: {} },
         headers: { 'Authorization' => "Bearer #{token}" },
         as: :json

    json = JSON.parse(response.body)
    expect(json['errors']).to be_nil
    expect(json.dig('data', 'currentUser', 'id').to_i).to eq(user.id)
  end

  it 'returns null currentUser for an invalid token' do
    post '/graphql',
         params: { query: query, variables: {} },
         headers: { 'Authorization' => 'Bearer not-a-real-token' },
         as: :json

    json = JSON.parse(response.body)
    expect(json.dig('data', 'currentUser')).to be_nil
  end
end
