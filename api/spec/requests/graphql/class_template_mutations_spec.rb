require "rails_helper"

RSpec.describe "Class template mutations", type: :request do
  let(:studio) { create(:studio) }
  let(:owner) { create(:user, :owner, studio: studio) }
  let(:staff) { create(:user, :staff, studio: studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }

  before { sign_in(owner) }

  # ============================================================
  # createClassTemplate
  # ============================================================
  describe "createClassTemplate mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($title: String!, $capacity: Int, $instructorId: ID) {
          createClassTemplate(input: { title: $title, capacity: $capacity, instructorId: $instructorId }) {
            classTemplate { id title capacity }
            errors
          }
        }
      GRAPHQL
    end

    it "allows owner to create a class template" do
      json = graphql_post(query: mutation, variables: { title: "Morning Flow", capacity: 10, instructorId: instructor.id.to_s })
      payload = json.dig("data", "createClassTemplate")
      expect(payload["errors"]).to be_empty
      expect(payload.dig("classTemplate", "title")).to eq("Morning Flow")
      expect(payload.dig("classTemplate", "capacity")).to eq(10)
    end

    it "allows staff to create a class template" do
      sign_in(staff)
      json = graphql_post(query: mutation, variables: { title: "Evening Flow", capacity: 8 })
      expect(json.dig("data", "createClassTemplate", "errors")).to be_empty
    end

    it "saves the template to the correct studio" do
      graphql_post(query: mutation, variables: { title: "Studio Check" })
      ct = ClassTemplate.find_by(title: "Studio Check")
      expect(ct.studio_id).to eq(studio.id)
    end

    it "rejects unauthenticated" do
      other_client = create(:user, :client, studio: studio)
      sign_in(other_client)
      json = graphql_post(query: mutation, variables: { title: "Unauthorized" })
      expect(json["errors"]).to be_present
    end
  end

  # ============================================================
  # updateClassTemplate
  # ============================================================
  describe "updateClassTemplate mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($id: ID!, $title: String, $capacity: Int) {
          updateClassTemplate(input: { id: $id, title: $title, capacity: $capacity }) {
            classTemplate { id title capacity }
            errors
          }
        }
      GRAPHQL
    end

    it "allows owner to update a class template" do
      ct = create(:class_template, instructor: instructor, title: "Old", capacity: 5)
      json = graphql_post(query: mutation, variables: { id: ct.id.to_s, title: "New Title", capacity: 15 })
      payload = json.dig("data", "updateClassTemplate")
      expect(payload["errors"]).to be_empty
      expect(payload.dig("classTemplate", "title")).to eq("New Title")
    end

    it "rejects updates to a template from another studio" do
      other_studio = create(:studio)
      other_instructor = create(:user, :instructor, studio: other_studio)
      other_ct = create(:class_template, instructor: other_instructor)
      graphql_post(query: mutation, variables: { id: other_ct.id.to_s, title: "Hacked" })
      expect(response.status).to eq(404)
    end
  end

  # ============================================================
  # deleteClassTemplate
  # ============================================================
  describe "deleteClassTemplate mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($id: ID!) {
          deleteClassTemplate(input: { id: $id }) {
            success
            errors
          }
        }
      GRAPHQL
    end

    it "allows owner to delete a template with no sessions" do
      ct = create(:class_template, instructor: instructor)
      json = graphql_post(query: mutation, variables: { id: ct.id.to_s })
      payload = json.dig("data", "deleteClassTemplate")
      expect(payload["success"]).to be true
      expect(ClassTemplate.exists?(ct.id)).to be false
    end

    it "staff can also delete a template (policy allows it)" do
      sign_in(staff)
      ct = create(:class_template, instructor: instructor)
      json = graphql_post(query: mutation, variables: { id: ct.id.to_s })
      payload = json.dig("data", "deleteClassTemplate")
      expect(payload["success"]).to be true
    end

    it "rejects an instructor from deleting a template" do
      sign_in(instructor)
      ct = create(:class_template, instructor: instructor)
      json = graphql_post(query: mutation, variables: { id: ct.id.to_s })
      payload = json.dig("data", "deleteClassTemplate")
      # Pundit error caught by rescue StandardError, returned in payload
      expect(payload["success"]).to be false
    end
  end
end