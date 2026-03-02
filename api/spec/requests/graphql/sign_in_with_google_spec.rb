require 'rails_helper'

RSpec.describe 'Sign in with Google', type: :request do
  let(:mutation) do
    <<~GRAPHQL
      mutation($code: String, $accessToken: String) {
        signInWithGoogle(input: { code: $code, accessToken: $accessToken }) {
          token
          user { id email name avatarUrl }
          errors
        }
      }
    GRAPHQL
  end

  around do |example|
    old = ENV.to_h
    begin
      ENV.delete('GOOGLE_CLIENT_ID')
      ENV.delete('VITE_GOOGLE_CLIENT_ID')
      ENV.delete('GOOGLE_CLIENT_SECRET')
      example.run
    ensure
      ENV.replace(old)
    end
  end

  it 'errors when GOOGLE_CLIENT_ID is not configured' do
    json = graphql_post(query: mutation, variables: { accessToken: 'at_1' })
    payload = json.dig('data', 'signInWithGoogle')
    expect(payload['token']).to be_nil
    expect(payload['errors']).to include('GOOGLE_CLIENT_ID is not configured')
  end

  it 'errors when neither code nor accessToken are provided' do
    ENV['GOOGLE_CLIENT_ID'] = 'client_1'
    json = graphql_post(query: mutation, variables: {})
    payload = json.dig('data', 'signInWithGoogle')
    expect(payload['token']).to be_nil
    expect(payload['errors']).to include('Provide code or accessToken')
  end

  it 'creates a user via accessToken userinfo and returns a JWT' do
    ENV['GOOGLE_CLIENT_ID'] = 'client_1'

    create(:studio)

    allow_any_instance_of(Mutations::SignInWithGoogle).to receive(:fetch_google_userinfo!).and_return(
      {
        'email' => 'g.user@example.com',
        'name' => 'Google User',
        'picture' => 'https://example.com/pic.png'
      }
    )

    json = graphql_post(query: mutation, variables: { accessToken: 'at_1' })
    payload = json.dig('data', 'signInWithGoogle')
    expect(payload['errors']).to eq([])
    expect(payload['token']).to be_present
    expect(payload.dig('user', 'email')).to eq('g.user@example.com')
    expect(payload.dig('user', 'avatarUrl')).to eq('https://example.com/pic.png')
  end

  it 'updates avatar for an existing user when picture changes' do
    ENV['GOOGLE_CLIENT_ID'] = 'client_1'
    create(:studio)
    user = create(:user, email: 'g.user@example.com', avatar_url: 'https://example.com/old.png')

    allow_any_instance_of(Mutations::SignInWithGoogle).to receive(:fetch_google_userinfo!).and_return(
      {
        'email' => 'g.user@example.com',
        'name' => 'Google User',
        'picture' => 'https://example.com/new.png'
      }
    )

    json = graphql_post(query: mutation, variables: { accessToken: 'at_1' })
    payload = json.dig('data', 'signInWithGoogle')
    expect(payload['errors']).to eq([])
    expect(user.reload.avatar_url).to eq('https://example.com/new.png')
  end

  it 'returns a friendly error when id_token validation fails in code flow' do
    ENV['GOOGLE_CLIENT_ID'] = 'client_1'
    ENV['GOOGLE_CLIENT_SECRET'] = 'secret_1'

    allow_any_instance_of(Mutations::SignInWithGoogle).to receive(:exchange_google_code_for_id_token!).and_return('id_token_1')

    validator = instance_double('GoogleIDToken::Validator')
    allow(GoogleIDToken::Validator).to receive(:new).and_return(validator)
    allow(validator).to receive(:check).and_raise(GoogleIDToken::ValidationError.new('bad token'))

    json = graphql_post(query: mutation, variables: { code: 'code_1' })
    payload = json.dig('data', 'signInWithGoogle')
    expect(payload['token']).to be_nil
    expect(payload['errors'].join(' ')).to match(/Invalid Google token/i)
  end
end
