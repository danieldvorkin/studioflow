# frozen_string_literal: true

module Types
  class QueryType < Types::BaseObject
    field :node, Types::NodeType, null: true, description: "Fetches an object given its ID." do
      argument :id, ID, required: true, description: "ID of the object."
    end

    def node(id:)
      context.schema.object_from_id(id, context)
    end

    field :nodes, [Types::NodeType, null: true], null: true, description: "Fetches a list of objects given a list of IDs." do
      argument :ids, [ID], required: true, description: "IDs of the objects."
    end

    def nodes(ids:)
      ids.map { |id| context.schema.object_from_id(id, context) }
    end

    # Add root-level fields here.
    # They will be entry points for queries on your schema.

    # Return the currently authenticated user
    field :current_user, Types::UserType, null: true
    def current_user
      context[:current_user]
    end

    field :studios, [Types::StudioType], null: false,
      description: "List all studios (for client marketplace browsing)"
    def studios
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      Studio.order(:name)
    end

    # List available class templates
    field :class_templates, [Types::ClassTemplateType], null: false do
    argument :instructor_id, ID, required: false
    argument :studio_location_id, ID, required: false
    argument :studio_id, ID, required: false
  end

  def class_templates(instructor_id: nil, studio_location_id: nil, studio_id: nil)
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    effective_studio_id = user.client? ? (studio_id.presence || user.studio_id) : user.studio_id

    scope = ClassTemplate.where(studio_id: effective_studio_id)
    scope = scope.where(instructor_id: instructor_id) if instructor_id
    if user&.instructor?
      scope = scope.where(instructor_id: user.id)
    end

    # Treat templates with NULL location as "global" and include them when filtering by location.
    scope = scope.where(studio_location_id: [studio_location_id, nil]) if studio_location_id
    scope
  end

    # List upcoming class sessions
    field :class_sessions, [Types::ClassSessionType], null: false do
    argument :from, GraphQL::Types::ISO8601DateTime, required: false
    argument :to, GraphQL::Types::ISO8601DateTime, required: false
    argument :studio_location_id, ID, required: false
    argument :studio_id, ID, required: false
    end
  def class_sessions(from: nil, to: nil, studio_location_id: nil, studio_id: nil)
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    effective_studio_id = user.client? ? (studio_id.presence || user.studio_id) : user.studio_id

    scope = ClassSession.where(studio_id: effective_studio_id, archived: false)
    scope = scope.where('start_time >= ?', from) if from
    scope = scope.where('start_time <= ?', to) if to
    if studio_location_id
      # Include sessions whose template is "global" (NULL location) or matches selected location.
      scope = scope.joins(:class_template).where(class_templates: { studio_location_id: [studio_location_id, nil] })
    end
    if user&.instructor?
      scope = scope.where(instructor_id: user.id)
    end

    scope.order(:start_time)
  end

    field :my_favorite_class_sessions, [Types::ClassSessionType], null: false,
      description: 'Favorite class sessions for the current user' do
      argument :studio_id, ID, required: false
      argument :studio_location_id, ID, required: false
    end
    def my_favorite_class_sessions(studio_id: nil, studio_location_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, 'Not authorized' unless user

      scope =
        ClassSession
          .joins(:favorite_class_sessions)
          .where(favorite_class_sessions: { user_id: user.id }, archived: false)

      if user.client?
        scope = scope.where(studio_id: studio_id) if studio_id.present?
      else
        scope = scope.where(studio_id: user.studio_id)
      end

      if studio_location_id
        scope = scope.joins(:class_template).where(class_templates: { studio_location_id: [studio_location_id, nil] })
      end

      scope
        .includes(:class_template, :instructor)
        .order(:start_time)
    end

    field :upcoming_bookable_class_sessions_count, Integer, null: false,
      description: 'Count of upcoming bookable class sessions (clients: across all studios unless a studio_id is provided)' do
      argument :studio_id, ID, required: false
      argument :studio_location_id, ID, required: false
    end
    def upcoming_bookable_class_sessions_count(studio_id: nil, studio_location_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, 'Not authorized' unless user

      scope = ClassSession.where(archived: false).where('start_time > ?', Time.current)

      if user.client?
        scope = scope.where(studio_id: studio_id) if studio_id.present?
      else
        scope = scope.where(studio_id: user.studio_id)
      end

      if studio_location_id
        scope = scope.joins(:class_template).where(class_templates: { studio_location_id: [studio_location_id, nil] })
      end

      if user&.instructor?
        scope = scope.where(instructor_id: user.id)
      end

      if user.client?
        booked_session_ids =
          Booking
            .joins(:client)
            .where(clients: { user_id: user.id }, archived: false)
            .where.not(status: 'cancelled')
            .select(:class_session_id)

        scope = scope.where.not(id: booked_session_ids)
      end

      joined = scope.joins(<<~SQL.squish)
        LEFT JOIN bookings active_bookings
          ON active_bookings.class_session_id = class_sessions.id
         AND active_bookings.archived = FALSE
         AND active_bookings.status <> 'cancelled'
      SQL

      eligible = joined
        .group('class_sessions.id', 'class_sessions.capacity')
        .having('class_sessions.capacity IS NULL OR class_sessions.capacity <= 0 OR class_sessions.capacity > COUNT(active_bookings.id)')

      eligible.count.keys.length
    end

    field :instructors, [Types::UserType], null: false,
    description: "List instructor users (owner and staff)"
    def instructors
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user&.owner? || user&.staff?

    User.where(studio_id: user.studio_id, role: User::ROLES[:instructor]).order(:name)
    end

    field :clients, [Types::ClientType], null: false,
    description: "List clients visible to the current user (owner/staff: all, instructor: their clients)"
    def clients
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    if user.owner? || user.staff?
      Client.where(studio_id: user.studio_id).order(:name)
    elsif user.instructor?
      Client.where(studio_id: user.studio_id)
          .joins(bookings: { class_session: :instructor })
          .where(class_sessions: { instructor_id: user.id })
          .distinct
          .order(:name)
    else
      raise GraphQL::ExecutionError, "Not authorized"
    end
    end

    field :users, [Types::UserType], null: false,
  	  description: "List all users (owner only)"
    def users
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner?

      User.where(studio_id: user.studio_id).order(:email)
    end

    field :bookings, [Types::BookingType], null: false,
    description: "Bookings visible to the current user based on role" do
    argument :studio_location_id, ID, required: false
    argument :studio_id, ID, required: false
  end
    def bookings(studio_location_id: nil, studio_id: nil)
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    effective_studio_id = user.client? ? (studio_id.presence || user.studio_id) : user.studio_id

    scope =
      if user.owner? || user.staff?
        Booking.where(studio_id: user.studio_id, archived: false)
      elsif user.instructor?
        Booking.joins(class_session: :instructor)
         .where(studio_id: user.studio_id, class_sessions: { instructor_id: user.id }, archived: false)
      elsif user.client?
        Booking.joins(:client)
         .where(studio_id: effective_studio_id, clients: { user_id: user.id }, archived: false)
      else
        Booking.none
      end

    if studio_location_id
      scope = scope.joins(class_session: :class_template)
          .where(class_templates: { studio_location_id: [studio_location_id, nil] })
    end

    scope.includes(:client, :class_session, :payment).order(created_at: :desc)
    end

    field :my_bookings, [Types::BookingType], null: false,
    description: "Bookings where the current user is the client, regardless of role" do
    argument :studio_location_id, ID, required: false
    argument :studio_id, ID, required: false
  end
    def my_bookings(studio_location_id: nil, studio_id: nil)
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    scope = Booking.joins(:client).where(clients: { user_id: user.id }, archived: false)

    if user.client?
      scope = scope.where(studio_id: studio_id) if studio_id.present?
    else
      scope = scope.where(studio_id: user.studio_id)
    end
    if studio_location_id
      scope = scope.joins(class_session: :class_template)
          .where(class_templates: { studio_location_id: [studio_location_id, nil] })
    end

    scope.includes(:client, :class_session, :payment).order(created_at: :desc)
  end

    field :payments, [Types::PaymentType], null: false,
    description: "Payment records (owner and staff)"
    def payments
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user&.owner? || user&.staff?

    Payment.where(studio_id: user.studio_id)
      .includes(:booking, :client, :class_session)
      .order(created_at: :desc)
    end

    field :payment_settings, Types::PaymentSettingType, null: false,
  description: "Stripe/Payment configuration (owner only)"
    def payment_settings
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user&.owner?

    PaymentSetting.instance_for(user.studio)
    end

    field :payment_public_settings, Types::PaymentPublicSettingType, null: false,
      description: "Stripe publishable key and enabled flag (any authenticated user)" do
      argument :studio_id, ID, required: false
    end
    def payment_public_settings(studio_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      effective_studio_id = user.client? ? (studio_id.presence || user.studio_id) : user.studio_id
      studio = Studio.find(effective_studio_id)

      PaymentSetting.instance_for(studio)
    end

    field :my_client, Types::ClientType, null: true,
      description: "Client record associated with the current user (if any)" do
      argument :studio_id, ID, required: false
    end
    def my_client(studio_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      effective_studio_id = user.client? ? (studio_id.presence || user.studio_id) : user.studio_id

      Client.find_by(user_id: user.id, studio_id: effective_studio_id)
    end

    field :studio_settings, Types::StudioSettingType, null: false,
      description: "Studio-wide UI settings (theme, titles)" do
      argument :studio_id, ID, required: false
    end
    def studio_settings(studio_id: nil)
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    effective_studio_id = user.client? ? (studio_id.presence || user.studio_id) : user.studio_id
    studio = Studio.find(effective_studio_id)

    PaymentSetting.instance_for(studio)
    end

    field :studio_locations, [Types::StudioLocationType], null: false,
	  description: "All studio locations" do
      argument :studio_id, ID, required: false
    end
    def studio_locations(studio_id: nil)
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    effective_studio_id = user.client? ? (studio_id.presence || user.studio_id) : user.studio_id

    StudioLocation.where(studio_id: effective_studio_id).order(:name)
    end

    field :instructor_earnings_weeks, [Types::InstructorEarningsWeekType], null: false,
      description: "Weekly instructor earnings (owner only)" do
      argument :week_start, GraphQL::Types::ISO8601Date, required: true
      argument :week_end, GraphQL::Types::ISO8601Date, required: false
      argument :instructor_id, ID, required: false
      argument :currency, String, required: false
    end
    def instructor_earnings_weeks(week_start:, week_end: nil, instructor_id: nil, currency: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner?

      build_snapshot_from_result = lambda do |result|
        {
          weekStart: result.week_start,
          weekEnd: result.week_end,
          currency: result.currency,
          grossCents: result.gross_cents,
          instructorEarningsCents: result.instructor_earnings_cents,
          studioCutCents: result.studio_cut_cents,
          paymentsCount: result.payments_count,
          sessionsTaughtCount: result.sessions_taught_count,
          templateBreakdown: result.template_breakdown.map do |row|
            {
              classTemplateId: row[:template].id,
              title: row[:template].title,
              grossCents: row[:gross_cents],
              instructorEarningsCents: row[:instructor_earnings_cents]
            }
          end
        }
      end

      breakdown_from_snapshot = lambda do |payout|
        snapshot = payout.calculation_snapshot
        raw_rows = Array(snapshot.is_a?(Hash) ? (snapshot['templateBreakdown'] || snapshot[:templateBreakdown]) : nil)
        return nil if raw_rows.empty?

        ids = raw_rows.map { |row| row.is_a?(Hash) ? (row['classTemplateId'] || row[:classTemplateId]) : nil }.compact
        return nil if ids.empty?

        templates_by_id = ClassTemplate.where(studio_id: user.studio_id, id: ids).index_by { |t| t.id.to_s }
        return nil unless ids.all? { |id| templates_by_id.key?(id.to_s) }

        raw_rows.map do |row|
          template_id = row['classTemplateId'] || row[:classTemplateId]
          {
            class_template: templates_by_id.fetch(template_id.to_s),
            gross_cents: row['grossCents'] || row[:grossCents] || 0,
            instructor_earnings_cents: row['instructorEarningsCents'] || row[:instructorEarningsCents] || 0
          }
        end
      end

      calculator = InstructorPayouts::WeeklyEarningsCalculator.new(
        week_start: week_start,
        week_end: week_end,
        instructor_id: instructor_id,
        currency: currency,
        studio_id: user.studio_id
      )
      results = calculator.call

      existing = InstructorPayout
        .where(studio_id: user.studio_id, week_start: week_start.to_date)
      existing = existing.where(instructor_id: instructor_id) if instructor_id
      existing = existing.where(currency: currency) if currency.present?

      existing_by_key = existing.index_by { |p| [p.instructor_id, p.currency] }

      results.map do |r|
        existing_payout = existing_by_key[[r.instructor.id, r.currency]]

        if existing_payout&.paid?
          snapshot = existing_payout.calculation_snapshot.is_a?(Hash) ? existing_payout.calculation_snapshot : {}
          locked_breakdown = breakdown_from_snapshot.call(existing_payout)

          locked_gross = existing_payout.gross_cents
          locked_instructor = existing_payout.instructor_earnings_cents
          locked_studio = existing_payout.studio_cut_cents
          locked_payments_count = snapshot['paymentsCount'] || snapshot[:paymentsCount] || r.payments_count
          locked_sessions_count = snapshot['sessionsTaughtCount'] || snapshot[:sessionsTaughtCount] || r.sessions_taught_count

          locked_template_breakdown = if locked_breakdown
            locked_breakdown
          else
            r.template_breakdown.map do |row|
              {
                class_template: row[:template],
                gross_cents: row[:gross_cents],
                instructor_earnings_cents: row[:instructor_earnings_cents]
              }
            end
          end

          next {
            instructor: r.instructor,
            currency: r.currency,
            week_start: r.week_start,
            week_end: r.week_end,
            gross_cents: locked_gross,
            instructor_earnings_cents: locked_instructor,
            studio_cut_cents: locked_studio,
            sessions_taught_count: locked_sessions_count,
            payments_count: locked_payments_count,
            template_breakdown: locked_template_breakdown,
            existing_payout: existing_payout
          }
        end

        # Keep unpaid payouts in sync with the current rate (draft/failed). This ensures
        # adjusting compensation updates the amount that will be paid later.
        if existing_payout
          desired_snapshot = build_snapshot_from_result.call(r)
          should_update =
            existing_payout.week_end != r.week_end ||
            existing_payout.gross_cents != r.gross_cents ||
            existing_payout.instructor_earnings_cents != r.instructor_earnings_cents ||
            existing_payout.studio_cut_cents != r.studio_cut_cents ||
            existing_payout.calculation_snapshot != desired_snapshot

          if should_update
            existing_payout.update(
              week_end: r.week_end,
              gross_cents: r.gross_cents,
              instructor_earnings_cents: r.instructor_earnings_cents,
              studio_cut_cents: r.studio_cut_cents,
              calculation_snapshot: desired_snapshot
            )
          end
        end

        {
          instructor: r.instructor,
          currency: r.currency,
          week_start: r.week_start,
          week_end: r.week_end,
          gross_cents: r.gross_cents,
          instructor_earnings_cents: r.instructor_earnings_cents,
          studio_cut_cents: r.studio_cut_cents,
          sessions_taught_count: r.sessions_taught_count,
          payments_count: r.payments_count,
          template_breakdown: r.template_breakdown.map do |row|
            {
              class_template: row[:template],
              gross_cents: row[:gross_cents],
              instructor_earnings_cents: row[:instructor_earnings_cents]
            }
          end,
          existing_payout: existing_payout
        }
      end
    end

    field :instructor_payouts, [Types::InstructorPayoutType], null: false,
      description: "Instructor payouts (owner only)" do
      argument :week_start, GraphQL::Types::ISO8601Date, required: false
      argument :instructor_id, ID, required: false
      argument :currency, String, required: false
    end
    def instructor_payouts(week_start: nil, instructor_id: nil, currency: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner?

      scope = InstructorPayout.where(studio_id: user.studio_id).includes(:instructor, :created_by).order(week_start: :desc, created_at: :desc)
      scope = scope.where(week_start: week_start.to_date) if week_start
      scope = scope.where(instructor_id: instructor_id) if instructor_id
      scope = scope.where(currency: currency) if currency.present?
      scope
    end

    # TODO: remove me
    field :test_field, String, null: false,
      description: "An example field added by the generator"
    def test_field
      "Hello World!"
    end
  end
end
