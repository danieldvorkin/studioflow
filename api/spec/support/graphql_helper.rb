module GraphqlHelper
  def graphql_post(query:, variables: {})
    post "/graphql", params: { query: query, variables: variables }, as: :json
    JSON.parse(response.body)
  end
end

RSpec.configure do |config|
  config.include GraphqlHelper, type: :request
end
