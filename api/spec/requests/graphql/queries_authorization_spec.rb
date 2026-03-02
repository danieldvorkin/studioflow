require "rails_helper"

RSpec.describe "GraphQL query authorization", type: :request do
  let(:studio) { create(:studio) }
  let(:owner) { create(:user, :owner, studio: studio) }
  let(:staff) { create(:user, :staff, studio: studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:client_user) { create(:user, :client, studio: studio) }

  describe "instructors query" do
    let(:query) do
      <<~GRAPHQL
        query {
          instructors { id email roleName }
        }
      GRAPHQL
    end

    it "allows owner" do
      sign_in(owner)
      json = graphql_post(query: query)
      expect(json["errors"]).to be_nil
      expect(json.dig("data", "instructors")).to be_an(Array)
    end

    it "allows staff" do
      sign_in(staff)
      json = graphql_post(query: query)
      expect(json["errors"]).to be_nil
      expect(json.dig("data", "instructors")).to be_an(Array)
    end

    it "rejects instructor" do
      sign_in(instructor)
      json = graphql_post(query: query)
      expect(json.dig("data", "instructors")).to be_nil
      expect(json["errors"]).to be_present
      expect(json["errors"].first["message"]).to match(/not authorized/i)
    end

    it "rejects client" do
      sign_in(client_user)
      json = graphql_post(query: query)
      expect(json.dig("data", "instructors")).to be_nil
      expect(json["errors"]).to be_present
      expect(json["errors"].first["message"]).to match(/not authorized/i)
    end
  end

  describe "users query" do
    let(:query) do
      <<~GRAPHQL
        query {
          users { id email roleName }
        }
      GRAPHQL
    end

    it "allows owner" do
      sign_in(owner)
      json = graphql_post(query: query)
      expect(json["errors"]).to be_nil
      expect(json.dig("data", "users")).to be_an(Array)
    end

    it "rejects staff" do
      sign_in(staff)
      json = graphql_post(query: query)
      expect(json.dig("data", "users")).to be_nil
      expect(json["errors"]).to be_present
    end

    it "rejects instructor" do
      sign_in(instructor)
      json = graphql_post(query: query)
      expect(json.dig("data", "users")).to be_nil
      expect(json["errors"]).to be_present
    end
  end

  describe "clients query" do
    let(:query) do
      <<~GRAPHQL
        query {
          clients { id name email }
        }
      GRAPHQL
    end

    it "allows owner (all clients)" do
      create(:client, studio: studio, name: "A")
      create(:client, studio: studio, name: "B")
      sign_in(owner)

      json = graphql_post(query: query)
      expect(json["errors"]).to be_nil
      expect(json.dig("data", "clients").map { |c| c["name"] }).to include("A", "B")
    end

    it "allows instructor but scopes to their booked clients" do
      other_studio = create(:studio)
      other_instructor = create(:user, :instructor, studio: other_studio)

      my_client = create(:client, studio: studio)
      other_client = create(:client, studio: other_studio)

      my_template = create(:class_template, instructor: instructor)
      other_template = create(:class_template, instructor: other_instructor)

      my_session = create(:class_session, class_template: my_template, instructor: instructor)
      other_session = create(:class_session, class_template: other_template, instructor: other_instructor, room: 'Room B')

      create(:booking, class_session: my_session, client: my_client)
      create(:booking, class_session: other_session, client: other_client)

      sign_in(instructor)
      json = graphql_post(query: query)

      expect(json["errors"]).to be_nil
      returned_ids = json.dig("data", "clients").map { |c| c["id"].to_i }
      expect(returned_ids).to include(my_client.id)
      expect(returned_ids).not_to include(other_client.id)
    end

    it "rejects client" do
      sign_in(client_user)
      json = graphql_post(query: query)

      expect(json.dig("data", "clients")).to be_nil
      expect(json["errors"]).to be_present
      expect(json["errors"].first["message"]).to match(/not authorized/i)
    end
  end
end
