require "rails_helper"

RSpec.describe "GraphQL location filtering", type: :request do
  let(:studio) { create(:studio) }
  let(:owner) { create(:user, :owner, studio: studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }

  before do
    sign_in(owner)
  end

  it "includes global (NULL location) templates when filtering by location" do
    loc_a = create(:studio_location, studio: studio)
    loc_b = create(:studio_location, studio: studio)

    global_template = create(:class_template, instructor: instructor, studio_location: nil)
    template_a = create(:class_template, instructor: instructor, studio_location: loc_a)
    template_b = create(:class_template, instructor: instructor, studio_location: loc_b)

    query = <<~GRAPHQL
      query($studioLocationId: ID) {
        classTemplates(studioLocationId: $studioLocationId) {
          id
          title
        }
      }
    GRAPHQL

    json = graphql_post(query: query, variables: { studioLocationId: loc_a.id.to_s })

    expect(json["errors"]).to be_nil
    ids = json.dig("data", "classTemplates").map { |t| t["id"].to_i }

    expect(ids).to include(global_template.id, template_a.id)
    expect(ids).not_to include(template_b.id)
  end

  it "includes global (NULL location) sessions when filtering by location" do
    loc_a = create(:studio_location, studio: studio)
    loc_b = create(:studio_location, studio: studio)

    global_template = create(:class_template, instructor: instructor, studio_location: nil)
    template_a = create(:class_template, instructor: instructor, studio_location: loc_a)
    template_b = create(:class_template, instructor: instructor, studio_location: loc_b)

    global_session = create(:class_session, class_template: global_template, start_time: 1.day.from_now)
    session_a = create(:class_session, class_template: template_a, start_time: 2.days.from_now)
    session_b = create(:class_session, class_template: template_b, start_time: 3.days.from_now)

    query = <<~GRAPHQL
      query($from: ISO8601DateTime, $to: ISO8601DateTime, $studioLocationId: ID) {
        classSessions(from: $from, to: $to, studioLocationId: $studioLocationId) {
          id
          startTime
          classTemplate { id }
        }
      }
    GRAPHQL

    json = graphql_post(
      query: query,
      variables: {
        from: Time.current.iso8601,
        to: 1.week.from_now.iso8601,
        studioLocationId: loc_a.id.to_s
      }
    )

    expect(json["errors"]).to be_nil
    ids = json.dig("data", "classSessions").map { |s| s["id"].to_i }

    expect(ids).to include(global_session.id, session_a.id)
    expect(ids).not_to include(session_b.id)
  end
end
