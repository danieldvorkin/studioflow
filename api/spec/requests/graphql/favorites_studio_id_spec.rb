require "rails_helper"

RSpec.describe "Favorites studioId", type: :request do
  it "returns studioId for a favorited class session" do
    studio = create(:studio)
    user = create(:user, :client, studio: studio)

    location = create(:studio_location, studio: studio)
    instructor = create(:user, :instructor, studio: studio)
    template = create(:class_template, studio: studio, studio_location: location, instructor: instructor)
    session = create(:class_session, studio: studio, class_template: template, instructor: instructor)

    FavoriteClassSession.create!(user: user, class_session: session)

    query = <<~GRAPHQL
      query($studioId: ID) {
        myFavoriteClassSessions(studioId: $studioId) {
          id
          studioId
        }
      }
    GRAPHQL

    sign_in(user)
    json = graphql_post(query: query, variables: { studioId: studio.id })

    expect(json["errors"]).to be_nil
    session_json = json.dig("data", "myFavoriteClassSessions").first
    expect(session_json["id"]).to eq(session.id.to_s)
    expect(session_json["studioId"]).to eq(studio.id.to_s)
  end
end
