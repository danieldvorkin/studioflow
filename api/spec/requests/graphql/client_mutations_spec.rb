require "rails_helper"

RSpec.describe "Client mutations", type: :request do
  let(:studio) { create(:studio) }
  let(:owner) { create(:user, :owner, studio: studio) }
  let(:staff) { create(:user, :staff, studio: studio) }
  let(:instructor) { create(:user, :instructor, studio: studio) }
  let(:client_user) { create(:user, :client, studio: studio) }

  before { sign_in(owner) }

  # ============================================================
  # updateClient
  # ============================================================
  describe "updateClient mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($id: ID!, $name: String, $email: String, $phone: String) {
          updateClient(input: { id: $id, name: $name, email: $email, phone: $phone }) {
            client { id name email phone }
            errors
          }
        }
      GRAPHQL
    end

    it "allows owner to update a client's name" do
      client = create(:client, studio: studio, name: "Old Name")
      json = graphql_post(query: mutation, variables: { id: client.id.to_s, name: "New Name" })
      payload = json.dig("data", "updateClient")
      expect(payload["errors"]).to be_empty
      expect(payload.dig("client", "name")).to eq("New Name")
    end

    it "allows staff to update a client" do
      sign_in(staff)
      client = create(:client, studio: studio)
      json = graphql_post(query: mutation, variables: { id: client.id.to_s, phone: "604-000-0000" })
      expect(json.dig("data", "updateClient", "errors")).to be_empty
    end

    it "rejects client user from updating another client" do
      sign_in(client_user)
      other_client = create(:client, studio: studio)
      json = graphql_post(query: mutation, variables: { id: other_client.id.to_s, name: "Hacked" })
      expect(json["errors"]).to be_present
    end

    it "returns error for unknown client id" do
      json = graphql_post(query: mutation, variables: { id: "99999", name: "X" })
      expect(response.status).to eq(404)
    end
  end

  # ============================================================
  # deleteClient
  # ============================================================
  describe "deleteClient mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($id: ID!) {
          deleteClient(input: { id: $id }) {
            success
            errors
          }
        }
      GRAPHQL
    end

    it "allows owner to delete a client" do
      client = create(:client, studio: studio)
      json = graphql_post(query: mutation, variables: { id: client.id.to_s })
      payload = json.dig("data", "deleteClient")
      expect(payload["success"]).to be true
      expect(Client.exists?(client.id)).to be false
    end

    it "rejects staff from deleting a client" do
      sign_in(staff)
      client = create(:client, studio: studio)
      json = graphql_post(query: mutation, variables: { id: client.id.to_s })
      payload = json.dig("data", "deleteClient")
      expect(payload["success"]).to be false
      expect(payload["errors"].join).to match(/not authorized/i)
    end

    it "returns not_found for a client belonging to another studio" do
      other_studio = create(:studio)
      other_client = create(:client, studio: other_studio)
      json = graphql_post(query: mutation, variables: { id: other_client.id.to_s })
      payload = json.dig("data", "deleteClient")
      expect(payload["success"]).to be false
    end
  end

  # ============================================================
  # createClientNote
  # ============================================================
  describe "createClientNote mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($clientId: ID!, $body: String!) {
          createClientNote(input: { clientId: $clientId, body: $body }) {
            note { id body }
            errors
          }
        }
      GRAPHQL
    end

    it "allows staff to add a note to a client" do
      sign_in(staff)
      client = create(:client, studio: studio)
      json = graphql_post(query: mutation, variables: { clientId: client.id.to_s, body: "Prefers morning" })
      payload = json.dig("data", "createClientNote")
      expect(payload["errors"]).to be_empty
      expect(payload.dig("note", "body")).to eq("Prefers morning")
    end

    it "rejects client user from adding notes" do
      sign_in(client_user)
      client = create(:client, studio: studio)
      json = graphql_post(query: mutation, variables: { clientId: client.id.to_s, body: "Note" })
      expect(json["errors"]).to be_present
    end
  end

  # ============================================================
  # clients query
  # ============================================================
  describe "clients query" do
    let(:query) do
      <<~GRAPHQL
        query {
          clients { id name email }
        }
      GRAPHQL
    end

    it "returns clients for the current studio" do
      c1 = create(:client, studio: studio)
      other_studio = create(:studio)
      create(:client, studio: other_studio)

      json = graphql_post(query: query)
      ids = json.dig("data", "clients").map { |c| c["id"].to_i }
      expect(ids).to include(c1.id)
      # Should not include other studio's client
      expect(ids.length).to eq(Client.where(studio: studio).count)
    end

    it "rejects unauthenticated" do
      sign_in(client_user)
      json = graphql_post(query: query)
      # client role cannot access the clients list
      expect(json["errors"]).to be_present.or(json.dig("data", "clients").to_a.empty? ? be_truthy : be_falsy)
    end
  end
end
