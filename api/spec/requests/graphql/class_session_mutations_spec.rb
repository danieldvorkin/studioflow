require "rails_helper"
require "time"

RSpec.describe "GraphQL class session mutations", type: :request do
  describe "createClassSession" do
    let(:studio) { create(:studio) }
    let(:owner) { create(:user, :owner, studio: studio) }

    before { sign_in(owner) }

    it "creates a session when instructor is active and available (no availability windows required)" do
      instructor = create(:user, :instructor, studio: studio, active: true, available_for_sessions: true)
      template = create(:class_template, instructor: instructor)

      mutation = <<~GRAPHQL
        mutation($input: CreateClassSessionInput!) {
          createClassSession(input: $input) {
            classSession { id startTime endTime instructor { id } }
            errors
          }
        }
      GRAPHQL

      start_time = 2.days.from_now.change(sec: 0)
      end_time = start_time + template.duration_minutes.minutes

      json = graphql_post(
        query: mutation,
        variables: {
          input: {
            classTemplateId: template.id.to_s,
            startTime: start_time.iso8601,
            endTime: end_time.iso8601
          }
        }
      )

      expect(json["errors"]).to be_nil

      payload = json.dig("data", "createClassSession")
      expect(payload["errors"]).to eq([])
      expect(payload.dig("classSession", "id")).to be_present
      expect(payload.dig("classSession", "instructor", "id").to_i).to eq(instructor.id)
    end

    it "returns a validation error when instructor is not available for sessions" do
      instructor = create(:user, :instructor, studio: studio, active: true, available_for_sessions: false)
      template = create(:class_template, instructor: instructor)

      mutation = <<~GRAPHQL
        mutation($input: CreateClassSessionInput!) {
          createClassSession(input: $input) {
            classSession { id }
            errors
          }
        }
      GRAPHQL

      json = graphql_post(
        query: mutation,
        variables: { input: { classTemplateId: template.id.to_s, startTime: 2.days.from_now.iso8601 } }
      )

      expect(json["errors"]).to be_nil

      payload = json.dig("data", "createClassSession")
      expect(payload["classSession"]).to be_nil
      expect(payload["errors"]).to include("Instructor is not available for sessions")
    end

    it "rejects creating a duplicate session for the same class template and start time" do
      instructor = create(:user, :instructor, studio: studio, active: true, available_for_sessions: true)
      template = create(:class_template, instructor: instructor)
      start_time = 2.days.from_now.change(sec: 0)
      end_time = start_time + template.duration_minutes.minutes

      create(:class_session, class_template: template, instructor: instructor, start_time: start_time, end_time: end_time)

      mutation = <<~GRAPHQL
        mutation($input: CreateClassSessionInput!) {
          createClassSession(input: $input) {
            classSession { id }
            errors
          }
        }
      GRAPHQL

      json = graphql_post(
        query: mutation,
        variables: {
          input: {
            classTemplateId: template.id.to_s,
            startTime: start_time.iso8601,
            endTime: end_time.iso8601
          }
        }
      )

      expect(json["errors"]).to be_nil
      payload = json.dig("data", "createClassSession")
      expect(payload["classSession"]).to be_nil
      expect(payload["errors"].join(' ')).to match(/already has this class scheduled at the same time/i)
    end
  end

  describe "updateClassSession" do
    it "allows the assigned instructor to update their own session" do
      studio = create(:studio)
      instructor = create(:user, :instructor, studio: studio)
      template = create(:class_template, instructor: instructor)
      session = create(:class_session, class_template: template, instructor: instructor)

      sign_in(instructor)

      mutation = <<~GRAPHQL
        mutation($input: UpdateClassSessionInput!) {
          updateClassSession(input: $input) {
            classSession { id startTime endTime }
            errors
          }
        }
      GRAPHQL

      new_start = session.start_time + 1.hour
      new_end = new_start + template.duration_minutes.minutes

      json = graphql_post(
        query: mutation,
        variables: { input: { id: session.id.to_s, startTime: new_start.iso8601, endTime: new_end.iso8601 } }
      )

      expect(json["errors"]).to be_nil
      payload = json.dig("data", "updateClassSession")
      expect(payload["errors"]).to eq([])
      returned_start = Time.iso8601(payload.dig("classSession", "startTime"))
      returned_end = Time.iso8601(payload.dig("classSession", "endTime"))
      expect(returned_start.to_i).to eq(new_start.to_i)
      expect(returned_end.to_i).to eq(new_end.to_i)
    end

    it "rejects an instructor updating someone else’s session" do
      studio = create(:studio)
      instructor = create(:user, :instructor, studio: studio)
      other_instructor = create(:user, :instructor, studio: studio)
      template = create(:class_template, instructor: other_instructor)
      session = create(:class_session, class_template: template, instructor: other_instructor)

      sign_in(instructor)

      mutation = <<~GRAPHQL
        mutation($input: UpdateClassSessionInput!) {
          updateClassSession(input: $input) {
            classSession { id }
            errors
          }
        }
      GRAPHQL

      json = graphql_post(
        query: mutation,
        variables: { input: { id: session.id.to_s, startTime: (session.start_time + 30.minutes).iso8601 } }
      )

      expect(json["data"]).to be_present
      expect(json["data"]["updateClassSession"]).to be_nil
      expect(json["errors"]).to be_present
      expect(json["errors"].first["message"]).to match(/Not authorized/i)
    end
  end

  describe "deleteClassSession" do
    let(:studio) { create(:studio) }
    let(:owner) { create(:user, :owner, studio: studio) }

    before { sign_in(owner) }

    it "archives the session instead of deleting, preserving payment history" do
      instructor = create(:user, :instructor, studio: studio, active: true, available_for_sessions: true)
      template = create(:class_template, instructor: instructor)
      start_time = 3.days.from_now.change(sec: 0)
      end_time = start_time + template.duration_minutes.minutes

      session = create(
        :class_session,
        class_template: template,
        instructor: instructor,
        start_time: start_time,
        end_time: end_time
      )
      booking = create(:booking, class_session: session)
      payment = Payment.create!(
        studio: studio,
        amount_cents: 1000,
        currency: "usd",
        status: "succeeded",
        class_session: session,
        booking: booking,
        client: booking.client
      )

      mutation = <<~GRAPHQL
        mutation($id: ID!) {
          deleteClassSession(input: { id: $id }) {
            success
            errors
          }
        }
      GRAPHQL

      json = graphql_post(query: mutation, variables: { id: session.id.to_s })

      expect(json["errors"]).to be_nil
      payload = json.dig("data", "deleteClassSession")
      expect(payload["success"]).to eq(true)
      expect(payload["errors"]).to eq([])

      expect(ClassSession.exists?(session.id)).to eq(true)
      expect(session.reload.archived).to eq(true)
      expect(booking.reload.archived).to eq(true)
      expect(payment.reload.class_session_id).to eq(session.id)
    end

    it "allows scheduling a new session at the same template + start time after cancel" do
      instructor = create(:user, :instructor, studio: studio, active: true, available_for_sessions: true)
      template = create(:class_template, instructor: instructor)
      start_time = 4.days.from_now.change(sec: 0)
      end_time = start_time + template.duration_minutes.minutes

      session = create(
        :class_session,
        class_template: template,
        instructor: instructor,
        start_time: start_time,
        end_time: end_time
      )

      delete_mutation = <<~GRAPHQL
        mutation($id: ID!) {
          deleteClassSession(input: { id: $id }) {
            success
            errors
          }
        }
      GRAPHQL

      delete_json = graphql_post(query: delete_mutation, variables: { id: session.id.to_s })
      expect(delete_json["errors"]).to be_nil
      expect(delete_json.dig("data", "deleteClassSession", "success")).to eq(true)
      expect(session.reload.archived).to eq(true)

      sign_in(owner)

      create_mutation = <<~GRAPHQL
        mutation($input: CreateClassSessionInput!) {
          createClassSession(input: $input) {
            classSession { id }
            errors
          }
        }
      GRAPHQL

      create_json = graphql_post(
        query: create_mutation,
        variables: {
          input: {
            classTemplateId: template.id.to_s,
            startTime: start_time.iso8601,
            endTime: end_time.iso8601
          }
        }
      )

      expect(create_json["errors"]).to be_nil
      payload = create_json.dig("data", "createClassSession")
      expect(payload["errors"]).to eq([])
      expect(payload.dig("classSession", "id")).to be_present
    end
  end
end
