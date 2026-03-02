require "rails_helper"

RSpec.describe "Instructor payouts", type: :request do
  let(:studio) { create(:studio) }
  let(:owner) { create(:user, :owner, studio: studio) }
  let(:staff) { create(:user, :staff, studio: studio) }
  let(:instructor) { create(:user, :instructor, studio: studio, instructor_default_split_percent: 60) }

  describe "instructorEarningsWeeks query" do
    let(:query) do
      <<~GRAPHQL
        query($weekStart: ISO8601Date!, $currency: String) {
          instructorEarningsWeeks(weekStart: $weekStart, currency: $currency) {
            instructor { id email roleName }
            currency
            weekStart
            weekEnd
            grossCents
            instructorEarningsCents
            studioCutCents
            paymentsCount
            templateBreakdown {
              classTemplate { id title }
              grossCents
              instructorEarningsCents
            }
            existingPayout { id status }
          }
        }
      GRAPHQL
    end

    it "allows owner and returns weekly earnings" do
      template = create(:class_template, instructor: instructor, price_cents: 10_000, currency: "cad", compensation_type: "revenue_share")
      week_start = Date.parse("2026-02-23")
      session = create(:class_session, class_template: template, instructor: instructor, start_time: week_start.to_time.change(hour: 10))
      client = create(:client, studio: studio)
      booking = create(:booking, class_session: session, client: client, paid: true, price_cents: 10_000)

      Payment.create!(
        studio: studio,
        booking: booking,
        client: client,
        class_session: session,
        amount_cents: 10_000,
        currency: "cad",
        status: "succeeded"
      )

      sign_in(owner)
      json = graphql_post(query: query, variables: { weekStart: week_start.to_s, currency: "cad" })

      expect(json["errors"]).to be_nil
      rows = json.dig("data", "instructorEarningsWeeks")
      expect(rows).to be_an(Array)

      row = rows.find { |r| r.dig("instructor", "id").to_i == instructor.id }
      expect(row).to be_present
      expect(row["grossCents"]).to eq(10_000)
      expect(row["instructorEarningsCents"]).to eq(6_000)
      expect(row["studioCutCents"]).to eq(4_000)
    end

    it "does not change already paid payout amounts when rates change" do
      template = create(:class_template, instructor: instructor, price_cents: 10_000, currency: "cad", compensation_type: "revenue_share")
      week_start = Date.parse("2026-02-23")
      session = create(:class_session, class_template: template, instructor: instructor, start_time: week_start.to_time.change(hour: 10))
      client = create(:client, studio: studio)
      booking = create(:booking, class_session: session, client: client, paid: true, price_cents: 10_000)

      Payment.create!(
        studio: studio,
        booking: booking,
        client: client,
        class_session: session,
        amount_cents: 10_000,
        currency: "cad",
        status: "succeeded"
      )

      payout = InstructorPayout.create!(
        studio: studio,
        instructor: instructor,
        created_by: owner,
        week_start: week_start,
        week_end: week_start + 6.days,
        currency: 'cad',
        gross_cents: 10_000,
        instructor_earnings_cents: 6_000,
        studio_cut_cents: 4_000,
        status: 'paid',
        paid_at: Time.zone.now,
        calculation_snapshot: {
          'paymentsCount' => 1,
          'sessionsTaughtCount' => 1,
          'templateBreakdown' => [
            {
              'classTemplateId' => template.id,
              'title' => template.title,
              'grossCents' => 10_000,
              'instructorEarningsCents' => 6_000
            }
          ]
        }
      )

      instructor.update!(instructor_default_split_percent: 70)

      sign_in(owner)
      json = graphql_post(query: query, variables: { weekStart: week_start.to_s, currency: "cad" })
      expect(json["errors"]).to be_nil

      row = json.dig("data", "instructorEarningsWeeks").find { |r| r.dig("instructor", "id").to_i == instructor.id }
      expect(row["existingPayout"]["id"].to_s).to eq(payout.id.to_s)

      # Even though the split changed to 70%, paid payout remains locked at what was paid.
      expect(row["grossCents"]).to eq(10_000)
      expect(row["instructorEarningsCents"]).to eq(6_000)
      expect(row["studioCutCents"]).to eq(4_000)

      expect(payout.reload.instructor_earnings_cents).to eq(6_000)
    end

    it "updates unpaid payout amounts when rates change" do
      template = create(:class_template, instructor: instructor, price_cents: 10_000, currency: "cad", compensation_type: "revenue_share")
      week_start = Date.parse("2026-02-23")
      session = create(:class_session, class_template: template, instructor: instructor, start_time: week_start.to_time.change(hour: 10))
      client = create(:client, studio: studio)
      booking = create(:booking, class_session: session, client: client, paid: true, price_cents: 10_000)

      Payment.create!(
        studio: studio,
        booking: booking,
        client: client,
        class_session: session,
        amount_cents: 10_000,
        currency: "cad",
        status: "succeeded"
      )

      payout = InstructorPayout.create!(
        studio: studio,
        instructor: instructor,
        created_by: owner,
        week_start: week_start,
        week_end: week_start + 6.days,
        currency: 'cad',
        gross_cents: 10_000,
        instructor_earnings_cents: 6_000,
        studio_cut_cents: 4_000,
        status: 'draft'
      )

      instructor.update!(instructor_default_split_percent: 70)

      sign_in(owner)
      json = graphql_post(query: query, variables: { weekStart: week_start.to_s, currency: "cad" })
      expect(json["errors"]).to be_nil

      row = json.dig("data", "instructorEarningsWeeks").find { |r| r.dig("instructor", "id").to_i == instructor.id }

      # Now the earnings reflect the new split (70%).
      expect(row["instructorEarningsCents"]).to eq(7_000)
      expect(row["studioCutCents"]).to eq(3_000)

      # And the unpaid payout record is updated too.
      expect(payout.reload.instructor_earnings_cents).to eq(7_000)
      expect(payout.studio_cut_cents).to eq(3_000)
    end

    it "rejects staff" do
      sign_in(staff)
      json = graphql_post(query: query, variables: { weekStart: Date.parse("2026-02-23").to_s, currency: "cad" })
      expect(json.dig("data", "instructorEarningsWeeks")).to be_nil
      expect(json["errors"]).to be_present
    end
  end

  describe "markInstructorPayoutPaid mutation" do
    let(:mutation) do
      <<~GRAPHQL
        mutation($id: ID!, $paidMethod: String!, $paidReference: String) {
          markInstructorPayoutPaid(input: { id: $id, paidMethod: $paidMethod, paidReference: $paidReference }) {
            payout {
              id
              status
              paidAt
              paidMethod
              paidReference
              stripeTransferId
            }
            errors
          }
        }
      GRAPHQL
    end

    it "allows owner to mark payout as paid manually" do
      payout = InstructorPayout.create!(
        studio: studio,
        instructor: instructor,
        created_by: owner,
        week_start: Date.parse('2026-02-23'),
        week_end: Date.parse('2026-03-01'),
        currency: 'cad',
        gross_cents: 10_000,
        instructor_earnings_cents: 6_000,
        studio_cut_cents: 4_000,
        status: 'draft'
      )

      sign_in(owner)
      json = graphql_post(query: mutation, variables: { id: payout.id.to_s, paidMethod: 'etransfer', paidReference: 'ABC123' })

      expect(json['errors']).to be_nil

      payload = json.dig('data', 'markInstructorPayoutPaid')
      expect(payload['errors']).to eq([])

      node = payload['payout']
      expect(node['status']).to eq('paid')
      expect(node['paidAt']).to be_present
      expect(node['paidMethod']).to eq('etransfer')
      expect(node['paidReference']).to eq('ABC123')
      expect(node['stripeTransferId']).to be_nil
    end

    it "rejects staff" do
      payout = InstructorPayout.create!(
        studio: studio,
        instructor: instructor,
        created_by: owner,
        week_start: Date.parse('2026-02-23'),
        week_end: Date.parse('2026-03-01'),
        currency: 'cad',
        gross_cents: 10_000,
        instructor_earnings_cents: 6_000,
        studio_cut_cents: 4_000,
        status: 'draft'
      )

      sign_in(staff)
      json = graphql_post(query: mutation, variables: { id: payout.id.to_s, paidMethod: 'cash', paidReference: nil })
      expect(json.dig('data', 'markInstructorPayoutPaid')).to be_nil
      expect(json['errors']).to be_present
    end
  end
end
