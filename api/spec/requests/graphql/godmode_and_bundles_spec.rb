require "rails_helper"

RSpec.describe "Godmode + bundles smoke", type: :request do
  describe "currentUser" do
    let(:query) do
      <<~GRAPHQL
        query {
          currentUser { id email roleName godmode }
        }
      GRAPHQL
    end

    it "exposes godmode: true and roleName: godmode for the configured email" do
      user = create(:user, email: "dvorkin212@gmail.com")
      sign_in(user)

      json = graphql_post(query: query)

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "currentUser", "godmode")).to eq(true)
      expect(json.dig("data", "currentUser", "roleName")).to eq("godmode")
    end

    it "returns godmode: false for a normal user" do
      user = create(:user)
      sign_in(user)

      json = graphql_post(query: query)

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "currentUser", "godmode")).to eq(false)
      expect(json.dig("data", "currentUser", "roleName")).not_to eq("godmode")
    end
  end

  describe "startImpersonation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation StartImpersonation($userId: ID!) {
          startImpersonation(input: { userId: $userId }) {
            token
            user { id email }
            errors
          }
        }
      GRAPHQL
    end

    it "allows godmode to impersonate across studios" do
      studio_a = create(:studio)
      studio_b = create(:studio)

      god = create(:user, email: "dvorkin212@gmail.com", studio: studio_a)
      target = create(:user, :owner, studio: studio_b)

      sign_in(god)
      json = graphql_post(query: mutation, variables: { userId: target.id.to_s })

      payload = json.dig("data", "startImpersonation")
      expect(payload["errors"]).to eq([])
      expect(payload["token"]).to be_present
      expect(payload.dig("user", "id").to_i).to eq(target.id)
    end

    it "does not allow a normal owner to impersonate a user in another studio" do
      studio_a = create(:studio)
      studio_b = create(:studio)

      owner = create(:user, :owner, studio: studio_a)
      target = create(:user, :owner, studio: studio_b)

      sign_in(owner)
      json = graphql_post(query: mutation, variables: { userId: target.id.to_s })

      payload = json.dig("data", "startImpersonation")
      expect(payload["token"]).to be_nil
      expect(payload["user"]).to be_nil
      expect(payload["errors"]).to include("User not found")
    end

    it "blocks impersonating a godmode user" do
      studio = create(:studio)

      god = create(:user, email: "dvorkin212@gmail.com", studio: studio)
      owner = create(:user, :owner, studio: studio)

      sign_in(owner)
      json = graphql_post(query: mutation, variables: { userId: god.id.to_s })

      payload = json.dig("data", "startImpersonation")
      expect(payload["token"]).to be_nil
      expect(payload["user"]).to be_nil
      expect(payload["errors"]).to include("Not authorized")
    end
  end

  describe "bundleProducts + createBundleProduct" do
    let(:bundle_products_query) do
      <<~GRAPHQL
        query {
          bundleProducts { id title active creditsCount priceCents currency }
        }
      GRAPHQL
    end

    let(:create_mutation) do
      <<~GRAPHQL
        mutation CreateBundleProduct($title: String!, $creditsCount: Int!, $priceCents: Int!, $currency: String!, $classTemplateId: ID) {
          createBundleProduct(input: { title: $title, creditsCount: $creditsCount, priceCents: $priceCents, currency: $currency, classTemplateId: $classTemplateId }) {
            bundleProduct { id title }
            errors
          }
        }
      GRAPHQL
    end

    it "allows owner to list bundle products" do
      studio = create(:studio)
      owner = create(:user, :owner, studio: studio)
      template = create(:class_template, instructor: create(:user, :instructor, studio: studio))

      BundleProduct.create!(
        studio: studio,
        title: "10 pack",
        description: nil,
        active: true,
        credits_count: 10,
        price_cents: 10000,
        currency: "cad",
        class_template: template
      )

      sign_in(owner)
      json = graphql_post(query: bundle_products_query)

      expect(json["errors"]).to be_nil
      expect(json.dig("data", "bundleProducts")).to be_an(Array)
      expect(json.dig("data", "bundleProducts").map { |r| r["title"] }).to include("10 pack")
    end

    it "rejects clients from listing bundle products" do
      studio = create(:studio)
      client_user = create(:user, :client, studio: studio)

      sign_in(client_user)
      json = graphql_post(query: bundle_products_query)

      expect(json.dig("data", "bundleProducts")).to be_nil
      expect(json["errors"]).to be_present
      expect(json["errors"].first["message"]).to match(/not authorized/i)
    end

    it "allows owner to create a bundle product" do
      studio = create(:studio)
      owner = create(:user, :owner, studio: studio)
      template = create(:class_template, instructor: create(:user, :instructor, studio: studio))

      sign_in(owner)
      json = graphql_post(
        query: create_mutation,
        variables: {
          title: "Starter pack",
          creditsCount: 5,
          priceCents: 5000,
          currency: "cad",
          classTemplateId: template.id.to_s
        }
      )

      payload = json.dig("data", "createBundleProduct")
      expect(json["errors"]).to be_nil
      expect(payload["errors"]).to eq([])
      expect(payload.dig("bundleProduct", "title")).to eq("Starter pack")
    end

    it "rejects clients from creating a bundle product" do
      studio = create(:studio)
      client_user = create(:user, :client, studio: studio)
      template = create(:class_template, instructor: create(:user, :instructor, studio: studio))

      sign_in(client_user)
      json = graphql_post(
        query: create_mutation,
        variables: {
          title: "Starter pack",
          creditsCount: 5,
          priceCents: 5000,
          currency: "cad",
          classTemplateId: template.id.to_s
        }
      )

      expect(json.dig("data", "createBundleProduct")).to be_nil
      expect(json["errors"]).to be_present
      expect(json["errors"].first["message"]).to match(/not authorized/i)
    end
  end

  describe "bundleShopProducts" do
    let(:query) do
      <<~GRAPHQL
        query BundleShopProducts($studioId: ID!) {
          bundleShopProducts(studioId: $studioId) {
            id
            title
            active
            creditsCount
            priceCents
            currency
          }
        }
      GRAPHQL
    end

    it "allows a client to list active bundle products for a studio" do
      studio_a = create(:studio)
      studio_b = create(:studio)
      client_user = create(:user, :client, studio: studio_a)
      template = create(:class_template, instructor: create(:user, :instructor, studio: studio_a))
      template_b = create(:class_template, instructor: create(:user, :instructor, studio: studio_b))

      BundleProduct.create!(
        studio: studio_a,
        title: "10 pack",
        description: nil,
        active: true,
        credits_count: 10,
        price_cents: 10000,
        currency: "cad",
        class_template: template
      )
      BundleProduct.create!(
        studio: studio_a,
        title: "Inactive",
        description: nil,
        active: false,
        credits_count: 10,
        price_cents: 10000,
        currency: "cad",
        class_template: template
      )
      BundleProduct.create!(
        studio: studio_b,
        title: "Other studio",
        description: nil,
        active: true,
        credits_count: 10,
        price_cents: 10000,
        currency: "cad",
        class_template: template_b
      )

      sign_in(client_user)
      json = graphql_post(query: query, variables: { studioId: studio_a.id.to_s })

      expect(json["errors"]).to be_nil
      titles = json.dig("data", "bundleShopProducts").map { |r| r["title"] }
      expect(titles).to include("10 pack")
      expect(titles).not_to include("Inactive")
      expect(titles).not_to include("Other studio")
    end
  end

  describe "updateClassSession bundle availability" do
    let(:mutation) do
      <<~GRAPHQL
        mutation UpdateClassSession($id: ID!, $bundleEnabled: Boolean, $bundleSpots: Int) {
          updateClassSession(input: { id: $id, bundleEnabled: $bundleEnabled, bundleSpots: $bundleSpots }) {
            classSession { id bundleEnabled bundleSpots }
            errors
          }
        }
      GRAPHQL
    end

    it "allows an instructor to enable bundles for their own session" do
      studio = create(:studio)
      instructor = create(:user, :instructor, studio: studio)
      template = create(:class_template, instructor: instructor)
      session = create(:class_session, class_template: template, instructor: instructor)

      sign_in(instructor)
      json = graphql_post(query: mutation, variables: { id: session.id.to_s, bundleEnabled: true, bundleSpots: 2 })

      expect(json["errors"]).to be_nil
      payload = json.dig("data", "updateClassSession")
      expect(payload["errors"]).to eq([])
      expect(payload.dig("classSession", "bundleEnabled")).to eq(true)
      expect(payload.dig("classSession", "bundleSpots")).to eq(2)
    end

    it "rejects an instructor from updating another instructor's session" do
      studio = create(:studio)
      instructor_a = create(:user, :instructor, studio: studio)
      instructor_b = create(:user, :instructor, studio: studio)
      template_b = create(:class_template, instructor: instructor_b)
      session_b = create(:class_session, class_template: template_b, instructor: instructor_b)

      sign_in(instructor_a)
      json = graphql_post(query: mutation, variables: { id: session_b.id.to_s, bundleEnabled: true, bundleSpots: 2 })

      expect(json.dig("data", "updateClassSession")).to be_nil
      expect(json["errors"]).to be_present
      expect(json["errors"].first["message"]).to match(/not authorized/i)
    end
  end
end
