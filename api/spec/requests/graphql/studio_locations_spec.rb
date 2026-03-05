require "rails_helper"

RSpec.describe "Studio locations mutations", type: :request do
  let(:studio) { create(:studio) }
  let(:owner) { create(:user, :owner, studio: studio) }
  let(:staff) { create(:user, :staff, studio: studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }

  before { sign_in(owner) }

  let(:create_mutation) do
    <<~GRAPHQL
      mutation($name: String!, $address: String, $city: String) {
        createStudioLocation(input: { name: $name, address: $address, city: $city }) {
          studioLocation { id name address city }
          errors
        }
      }
    GRAPHQL
  end

  let(:update_mutation) do
    <<~GRAPHQL
      mutation($id: ID!, $name: String) {
        updateStudioLocation(input: { id: $id, name: $name }) {
          studioLocation { id name }
          errors
        }
      }
    GRAPHQL
  end

  let(:delete_mutation) do
    <<~GRAPHQL
      mutation($id: ID!) {
        deleteStudioLocation(input: { id: $id }) {
          success
          errors
        }
      }
    GRAPHQL
  end

  describe "createStudioLocation" do
    it "allows owner to create a location" do
      json = graphql_post(query: create_mutation, variables: { name: "Downtown", address: "123 Main St", city: "Vancouver" })
      payload = json.dig("data", "createStudioLocation")
      expect(payload["errors"]).to be_empty
      expect(payload.dig("studioLocation", "name")).to eq("Downtown")
      expect(payload.dig("studioLocation", "city")).to eq("Vancouver")
    end

    it "assigns the location to the current studio" do
      graphql_post(query: create_mutation, variables: { name: "Eastside" })
      loc = StudioLocation.find_by(name: "Eastside")
      expect(loc.studio_id).to eq(studio.id)
    end

    it "rejects staff from creating a location" do
      sign_in(staff)
      json = graphql_post(query: create_mutation, variables: { name: "Staff Location" })
      expect(json["errors"]).to be_present
    end

    it "rejects instructor from creating a location" do
      sign_in(instructor)
      json = graphql_post(query: create_mutation, variables: { name: "Instructor Location" })
      expect(json["errors"]).to be_present
    end
  end

  describe "updateStudioLocation" do
    it "allows owner to update a location's name" do
      loc = create(:studio_location, studio: studio, name: "Old Name")
      json = graphql_post(query: update_mutation, variables: { id: loc.id.to_s, name: "New Name" })
      payload = json.dig("data", "updateStudioLocation")
      expect(payload["errors"]).to be_empty
      expect(payload.dig("studioLocation", "name")).to eq("New Name")
    end
  end

  describe "deleteStudioLocation" do
    it "allows owner to delete a location with no classes" do
      loc = create(:studio_location, studio: studio)
      json = graphql_post(query: delete_mutation, variables: { id: loc.id.to_s })
      expect(json.dig("data", "deleteStudioLocation", "success")).to be true
      expect(StudioLocation.exists?(loc.id)).to be false
    end

    it "rejects deletion when location has class templates" do
      loc = create(:studio_location, studio: studio)
      create(:class_template, instructor: instructor, studio_location: loc)
      json = graphql_post(query: delete_mutation, variables: { id: loc.id.to_s })
      payload = json.dig("data", "deleteStudioLocation")
      expect(payload["success"]).to be false
      expect(payload["errors"].join).to match(/still has classes/i)
    end

    it "returns false for a location from another studio" do
      other_studio = create(:studio)
      other_loc = create(:studio_location, studio: other_studio)
      json = graphql_post(query: delete_mutation, variables: { id: other_loc.id.to_s })
      # Should not find or return false
      payload = json.dig("data", "deleteStudioLocation")
      expect(payload["success"]).to be false
    end
  end
end
