# frozen_string_literal: true

module Types
  class QueryType < Types::BaseObject
    field :node, Types::NodeType, null: true, description: "Fetches an object given its ID." do
      argument :id, ID, required: true, description: "ID of the object."
    end

    def node(id:)
      context.schema.object_from_id(id, context)
    end

    field :nodes, [ Types::NodeType, null: true ], null: true, description: "Fetches a list of objects given a list of IDs." do
      argument :ids, [ ID ], required: true, description: "IDs of the objects."
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

    # Public class landing page — no auth required
    field :public_class_page, Types::PublicClassPageType, null: true,
      description: "Fetch public class info by studio invite code and template ID (no auth required)" do
      argument :studio_invite_code, String, required: true
      argument :template_id, ID, required: true
    end
    def public_class_page(studio_invite_code:, template_id:)
      studio = Studio.find_by(invite_code: studio_invite_code.to_s.strip)
      return nil unless studio

      template = studio.class_templates.find_by(id: template_id)
      return nil unless template

      sessions = studio.class_sessions
        .where(class_template_id: template.id)
        .where("start_time > ?", Time.current)
        .order(:start_time)
        .limit(30)

      OpenStruct.new(
        studio_name: studio.name,
        studio_invite_code: studio.invite_code,
        template: template,
        upcoming_sessions: sessions
      )
    end

    field :studios, [ Types::StudioType ], null: false,
      description: "List all studios (for client marketplace browsing)"
    def studios
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      Studio.order(:name)
    end

    field :studio, Types::StudioType, null: true,
      description: "Fetch a single studio by ID (for studio show page)" do
      argument :id, ID, required: true
    end
    def studio(id:)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      Studio.find_by(id: id)
    end

    field :my_studio, Types::StudioType, null: true,
      description: "Returns the current owner's studio with onboarding status"
    def my_studio
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner?

      user.studio
    end

    # List available class templates
    field :class_templates, [ Types::ClassTemplateType ], null: false do
    argument :instructor_id, ID, required: false
    argument :studio_location_id, ID, required: false
    argument :studio_id, ID, required: false
  end

  def class_templates(instructor_id: nil, studio_location_id: nil, studio_id: nil)
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    effective_studio_id =
      if user.godmode?
        studio_id.presence
      elsif user.client?
        studio_id.presence || user.studio_id
      else
        user.studio_id
      end

    scope = ClassTemplate.all
    scope = scope.where(studio_id: effective_studio_id) if effective_studio_id
    scope = scope.where(instructor_id: instructor_id) if instructor_id && !user&.instructor?
    if user&.instructor?
      taught_template_ids =
        ClassSession
          .where(studio_id: effective_studio_id, instructor_id: user.id)
          .distinct
          .pluck(:class_template_id)

      assigned = scope.where(instructor_id: user.id)
      taught = scope.where(id: taught_template_ids)
      scope = assigned.or(taught)
    end

    # Treat templates with NULL location as "global" and include them when filtering by location.
    scope = scope.where(studio_location_id: [ studio_location_id, nil ]) if studio_location_id
    scope
  end

    # List upcoming class sessions
    field :class_sessions, [ Types::ClassSessionType ], null: false do
    argument :from, GraphQL::Types::ISO8601DateTime, required: false
    argument :to, GraphQL::Types::ISO8601DateTime, required: false
    argument :studio_location_id, ID, required: false
    argument :studio_id, ID, required: false
    end
  def class_sessions(from: nil, to: nil, studio_location_id: nil, studio_id: nil)
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    effective_studio_id =
      if user.godmode?
        studio_id.presence
      elsif user.client?
        studio_id.presence || user.studio_id
      else
        user.studio_id
      end

    scope = ClassSession.where(archived: false)
    scope = scope.where(studio_id: effective_studio_id) if effective_studio_id
    scope = scope.where("start_time >= ?", from) if from
    scope = scope.where("start_time <= ?", to) if to
    if studio_location_id
      # Include sessions whose template is "global" (NULL location) or matches selected location.
      scope = scope.joins(:class_template).where(class_templates: { studio_location_id: [ studio_location_id, nil ] })
    end
    if user&.instructor?
      scope = scope.where(instructor_id: user.id)
    end

    scope.order(:start_time)
  end

    field :my_favorite_class_sessions, [ Types::ClassSessionType ], null: false,
      description: "Favorite class sessions for the current user" do
      argument :studio_id, ID, required: false
      argument :studio_location_id, ID, required: false
    end
    def my_favorite_class_sessions(studio_id: nil, studio_location_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      scope =
        ClassSession
          .joins(:favorite_class_sessions)
          .where(favorite_class_sessions: { user_id: user.id }, archived: false)

      if user.godmode?
        scope = scope.where(studio_id: studio_id) if studio_id.present?
      elsif user.client?
        scope = scope.where(studio_id: studio_id) if studio_id.present?
      else
        scope = scope.where(studio_id: user.studio_id)
      end

      if studio_location_id
        scope = scope.joins(:class_template).where(class_templates: { studio_location_id: [ studio_location_id, nil ] })
      end

      scope
        .includes(:class_template, :instructor)
        .order(:start_time)
    end

    field :upcoming_bookable_class_sessions_count, Integer, null: false,
      description: "Count of upcoming bookable class sessions (clients: across all studios unless a studio_id is provided)" do
      argument :studio_id, ID, required: false
      argument :studio_location_id, ID, required: false
    end
    def upcoming_bookable_class_sessions_count(studio_id: nil, studio_location_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      scope = ClassSession.where(archived: false).where("start_time > ?", Time.current)

      if user.godmode?
        scope = scope.where(studio_id: studio_id) if studio_id.present?
      elsif user.client?
        scope = scope.where(studio_id: studio_id) if studio_id.present?
      else
        scope = scope.where(studio_id: user.studio_id)
      end

      if studio_location_id
        scope = scope.joins(:class_template).where(class_templates: { studio_location_id: [ studio_location_id, nil ] })
      end

      if user&.instructor?
        scope = scope.where(instructor_id: user.id)
      end

      if user.client?
        booked_session_ids =
          Booking
            .joins(:client)
            .where(clients: { user_id: user.id }, archived: false)
            .where.not(status: "cancelled")
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
        .group("class_sessions.id", "class_sessions.capacity")
        .having("class_sessions.capacity IS NULL OR class_sessions.capacity <= 0 OR class_sessions.capacity > COUNT(active_bookings.id)")

      eligible.count.keys.length
    end

    field :instructors, [ Types::UserType ], null: false,
    description: "List instructor users (owner and staff)"
    def instructors
    user = context[:current_user]
    require_management_access!(user)

    if user.platform_staff?
      User.where(role: User::ROLES[:instructor]).order(:name)
    else
      User.where(studio_id: user.studio_id, role: User::ROLES[:instructor]).order(:name)
    end
    end

    field :clients, [ Types::ClientType ], null: false,
      description: "List clients visible to the current user (owner/staff: all, instructor: their clients)"
    def clients
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      if user.platform_staff?
        Client.order(:name)
      elsif user.owner? || user.staff?
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

    field :client, Types::ClientType, null: true,
      description: "Fetch a single client (owner/staff: any in studio; instructor: only clients they have taught)" do
      argument :id, ID, required: true
    end

    def client(id:)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      if user.platform_staff?
        Client.find(id)
      elsif user.owner? || user.staff?
        Client.where(studio_id: user.studio_id).find(id)
      elsif user.instructor?
        candidate = Client.where(studio_id: user.studio_id).find(id)
        taught = Booking.joins(:class_session)
          .where(client_id: candidate.id, archived: false, class_sessions: { instructor_id: user.id })
          .exists?
        raise GraphQL::ExecutionError, "Not authorized" unless taught
        candidate
      else
        raise GraphQL::ExecutionError, "Not authorized"
      end
    end

    field :users, [ Types::UserType ], null: false,
      description: "List all users (owner only)"
    def users
      user = context[:current_user]
      require_owner_access!(user)

      if user.platform_staff?
        User.order(:email)
      else
        User.where(studio_id: user.studio_id).order(:email)
      end
    end

    field :moderators, [ Types::UserType ], null: false,
      description: "List all moderator accounts (godmode only)"
    def moderators
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.godmode?

      User.where(role: User::ROLES[:moderator]).order(:email)
    end

    field :bookings, [ Types::BookingType ], null: false,
    description: "Bookings visible to the current user based on role" do
    argument :studio_location_id, ID, required: false
    argument :studio_id, ID, required: false
  end
    def bookings(studio_location_id: nil, studio_id: nil)
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    effective_client_studio_id = studio_id.presence || user.studio_id

    scope =
      if user.godmode?
        base = Booking.where(archived: false)
        studio_id.present? ? base.where(studio_id: studio_id) : base
      elsif user.owner? || user.staff?
        Booking.where(studio_id: user.studio_id, archived: false)
      elsif user.instructor?
        Booking.joins(class_session: :instructor)
         .where(studio_id: user.studio_id, class_sessions: { instructor_id: user.id }, archived: false)
      elsif user.client?
        Booking.joins(:client)
         .where(studio_id: effective_client_studio_id, clients: { user_id: user.id }, archived: false)
      else
        Booking.none
      end

    if studio_location_id
      scope = scope.joins(class_session: :class_template)
          .where(class_templates: { studio_location_id: [ studio_location_id, nil ] })
    end

    scope.includes(:client, :class_session, :payment).order(created_at: :desc)
    end

    field :my_bookings, [ Types::BookingType ], null: false,
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
          .where(class_templates: { studio_location_id: [ studio_location_id, nil ] })
    end

    scope.includes(:client, :class_session, :payment).order(created_at: :desc)
  end

    field :payments, [ Types::PaymentType ], null: false,
    description: "Payment records (owner and staff)"
    def payments
    user = context[:current_user]
    require_management_access!(user)

    base = user.platform_staff? ? Payment.all : Payment.where(studio_id: user.studio_id)
    base
      .includes(:booking, :client, :class_session)
      .order(created_at: :desc)
    end

    field :payment_settings, Types::PaymentSettingType, null: false,
  description: "Stripe/Payment configuration (owner only)"
    def payment_settings
    user = context[:current_user]
    require_owner_access!(user)

    PaymentSetting.instance_for(user.studio)
    end

    field :payment_public_settings, Types::PaymentPublicSettingType, null: false,
      description: "Stripe publishable key and enabled flag (any authenticated user)" do
      argument :studio_id, ID, required: false
    end
    def payment_public_settings(studio_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      effective_studio_id =
        if user.godmode?
          studio_id.presence || user.studio_id
        elsif user.client?
          studio_id.presence || user.studio_id
        else
          user.studio_id
        end
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

      effective_studio_id =
        if user.godmode?
          studio_id.presence || user.studio_id
        elsif user.client?
          studio_id.presence || user.studio_id
        else
          user.studio_id
        end

      Client.find_by(user_id: user.id, studio_id: effective_studio_id)
    end

    field :studio_settings, Types::StudioSettingType, null: false,
      description: "Studio-wide UI settings (theme, titles)" do
      argument :studio_id, ID, required: false
    end
    def studio_settings(studio_id: nil)
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    effective_studio_id =
      if user.godmode?
        studio_id.presence || user.studio_id
      elsif user.client?
        studio_id.presence || user.studio_id
      else
        user.studio_id
      end
    studio = Studio.find(effective_studio_id)

    PaymentSetting.instance_for(studio)
    end

    field :studio_locations, [ Types::StudioLocationType ], null: false,
    description: "All studio locations" do
      argument :studio_id, ID, required: false
    end
    def studio_locations(studio_id: nil)
    user = context[:current_user]
    raise GraphQL::ExecutionError, "Not authorized" unless user

    effective_studio_id =
      if user.godmode?
        studio_id.presence || user.studio_id
      elsif user.client?
        studio_id.presence || user.studio_id
      else
        user.studio_id
      end

    StudioLocation.where(studio_id: effective_studio_id).order(:name)
    end

    field :instructor_earnings_weeks, [ Types::InstructorEarningsWeekType ], null: false,
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
        raw_rows = Array(snapshot.is_a?(Hash) ? (snapshot["templateBreakdown"] || snapshot[:templateBreakdown]) : nil)
        return nil if raw_rows.empty?

        ids = raw_rows.map { |row| row.is_a?(Hash) ? (row["classTemplateId"] || row[:classTemplateId]) : nil }.compact
        return nil if ids.empty?

        templates_by_id = ClassTemplate.where(studio_id: user.studio_id, id: ids).index_by { |t| t.id.to_s }
        return nil unless ids.all? { |id| templates_by_id.key?(id.to_s) }

        raw_rows.map do |row|
          template_id = row["classTemplateId"] || row[:classTemplateId]
          {
            class_template: templates_by_id.fetch(template_id.to_s),
            gross_cents: row["grossCents"] || row[:grossCents] || 0,
            instructor_earnings_cents: row["instructorEarningsCents"] || row[:instructorEarningsCents] || 0
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

      existing_by_key = existing.index_by { |p| [ p.instructor_id, p.currency ] }

      results.map do |r|
        existing_payout = existing_by_key[[ r.instructor.id, r.currency ]]

        if existing_payout&.paid?
          snapshot = existing_payout.calculation_snapshot.is_a?(Hash) ? existing_payout.calculation_snapshot : {}
          locked_breakdown = breakdown_from_snapshot.call(existing_payout)

          locked_gross = existing_payout.gross_cents
          locked_instructor = existing_payout.instructor_earnings_cents
          locked_studio = existing_payout.studio_cut_cents
          locked_payments_count = snapshot["paymentsCount"] || snapshot[:paymentsCount] || r.payments_count
          locked_sessions_count = snapshot["sessionsTaughtCount"] || snapshot[:sessionsTaughtCount] || r.sessions_taught_count

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

    field :instructor_payouts, [ Types::InstructorPayoutType ], null: false,
      description: "Instructor payouts (owner only)" do
      argument :week_start, GraphQL::Types::ISO8601Date, required: false
      argument :instructor_id, ID, required: false
      argument :currency, String, required: false
    end
    def instructor_payouts(week_start: nil, instructor_id: nil, currency: nil)
      user = context[:current_user]
      require_owner_access!(user)

      base_scope = user.platform_staff? ? InstructorPayout.all : InstructorPayout.where(studio_id: user.studio_id)
      scope = base_scope.includes(:instructor, :created_by).order(week_start: :desc, created_at: :desc)
      scope = scope.where(week_start: week_start.to_date) if week_start
      scope = scope.where(instructor_id: instructor_id) if instructor_id
      scope = scope.where(currency: currency) if currency.present?
      scope
    end

    field :bundle_products, [ Types::BundleProductType ], null: false,
      description: "Bundle products (owner/staff)"
    def bundle_products
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless Pundit.policy(user, BundleProduct)&.index?

      BundleProduct.where(studio_id: user.studio_id).order(created_at: :desc)
    end

    field :bundle_shop_products, [ Types::BundleProductType ], null: false,
      description: "Active bundle products available for clients to purchase" do
      argument :studio_id, ID, required: false
      argument :currency, String, required: false
    end
    def bundle_shop_products(studio_id: nil, currency: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      effective_studio_id =
        if user.godmode?
          studio_id.presence
        elsif user.client?
          studio_id.presence || user.studio_id
        else
          user.studio_id
        end

      raise GraphQL::ExecutionError, "Studio is required" if effective_studio_id.blank?

      scope = BundleProduct.where(studio_id: effective_studio_id, active: true)
      scope = scope.where(currency: currency) if currency.present?
      scope.order(:title)
    end

    field :bundle_products_for_class_session, [ Types::BundleProductType ], null: false,
      description: "Active bundle products that can be redeemed for a specific class session" do
      argument :class_session_id, ID, required: true
    end
    def bundle_products_for_class_session(class_session_id:)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      cs =
        if user.client?
          ClassSession.where(archived: false).find(class_session_id)
        else
          ClassSession.where(studio_id: user.studio_id).find(class_session_id)
        end

      currency = cs.class_template&.currency.presence || "cad"
      scope = BundleProduct.where(studio_id: cs.studio_id, active: true, currency: currency)

      scope = scope.where(class_template_id: [ cs.class_template_id, nil ])
      scope = scope.where(instructor_id: [ cs.instructor_id, nil ])

      scope.order(:title)
    end

    field :my_bundle_purchases, [ Types::BundlePurchaseType ], null: false,
      description: "Bundle purchases for the current client user (credits remaining)" do
      argument :studio_id, ID, required: false
    end
    def my_bundle_purchases(studio_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user
      raise GraphQL::ExecutionError, "Not authorized" unless Pundit.policy(user, BundlePurchase)&.index?

      client_ids = Client.where(user_id: user.id).select(:id)
      scope = BundlePurchase.where(client_id: client_ids, status: "succeeded").where("credits_remaining > 0")
      scope = scope.where(studio_id: studio_id) if studio_id.present?

      scope.includes(:bundle_product).order(created_at: :desc)
    end

    # Platform subscriptions (godmode: all studios; owner: own studio)
    field :studio_subscriptions, [ Types::StudioSubscriptionType ], null: false,
      description: "All studio platform subscriptions (godmode only)"
    def studio_subscriptions
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.godmode?

      StudioSubscription.includes(:studio).order("studios.name")
    end

    field :my_studio_subscription, Types::StudioSubscriptionType, null: true,
      description: "Current studio's platform subscription (owner view)"
    def my_studio_subscription
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      StudioSubscription.find_by(studio_id: user.studio_id)
    end

    field :platform_payment_settings, Types::PlatformPaymentSettingType, null: false,
      description: "Platform-level Stripe publishable key (owner only)"
    def platform_payment_settings
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner? && !user.godmode?

      pk = ENV["PLATFORM_STRIPE_PUBLISHABLE_KEY"].presence
      { stripe_publishable_key: pk, configured: pk.present? }
    end

    field :client_invitations, [ Types::ClientInvitationType ], null: false,
      description: "All invitations sent by this studio (owner/staff/instructor)"
    def client_invitations
      user = context[:current_user]
      unless user&.owner? || user&.staff? || user&.instructor?
        raise GraphQL::ExecutionError, "Not authorized"
      end

      ClientInvitation.where(studio_id: user.studio_id).order(created_at: :desc)
    end

    field :client_invitation_by_token, Types::ClientInvitationType, null: true,
      description: "Look up a client invitation by its token (public — used on signup page)" do
      argument :token, String, required: true
    end
    def client_invitation_by_token(token:)
      ClientInvitation.find_by(token: token.to_s.strip)
    end

    # ── Memberships ──────────────────────────────────────────────────────────────

    field :membership_plans, [ Types::MembershipPlanType ], null: false,
      description: "Plans defined for the studio. Owners see all; clients see only active plans." do
      argument :studio_id, ID, required: false
    end
    def membership_plans(studio_id: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      effective_studio_id =
        if user.client?
          studio_id.presence || user.studio_id
        else
          user.studio_id
        end

      scope = MembershipPlan.where(studio_id: effective_studio_id).ordered
      user.client? ? scope.published : scope
    end

    field :client_memberships, [ Types::ClientMembershipType ], null: false,
      description: "All client memberships for this studio (owner/staff). Clients see their own." do
      argument :client_id,         ID,     required: false
      argument :membership_plan_id, ID,    required: false
      argument :status,            String, required: false
    end
    def client_memberships(client_id: nil, membership_plan_id: nil, status: nil)
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user

      if user.client?
        client = Client.find_by(user_id: user.id, studio_id: user.studio_id)
        return [] unless client
        scope = ClientMembership.where(client_id: client.id)
      else
        raise Pundit::NotAuthorizedError unless user.owner? || user.staff?
        scope = ClientMembership.where(studio_id: user.studio_id)
        scope = scope.where(client_id: client_id) if client_id.present?
        scope = scope.where(membership_plan_id: membership_plan_id) if membership_plan_id.present?
      end

      scope = scope.where(status: status) if status.present?
      scope.order(created_at: :desc)
    end

    # Platform-wide analytics (godmode only)
    field :platform_stats, Types::PlatformStatsType, null: false,
      description: "Aggregate platform metrics visible to godmode users only"
    def platform_stats
      user = context[:current_user]
      raise GraphQL::ExecutionError, "Not authorized" unless user&.godmode?

      month_start = Time.current.beginning_of_month

      {
        studios_count:              Studio.count,
        active_subscriptions_count: StudioSubscription.where(status: "active").count,
        total_users_count:          User.count,
        total_clients_count:        Client.count,
        total_bookings_count:       Booking.count,
        confirmed_bookings_count:   Booking.where(status: "confirmed").count,
        total_payments_count:       Payment.where(status: "succeeded").count,
        total_revenue_cents:        Payment.where(status: "succeeded").sum(:amount_cents),
        new_studios_this_month:     Studio.where("created_at >= ?", month_start).count,
        subscriptions_by_tier:      StudioSubscription.group(:tier).count
      }
    end

    # TODO: remove me
    field :test_field, String, null: false,
      description: "An example field added by the generator"
    def test_field
      "Hello World!"
    end

    private

    # Management access: owner, staff, or platform staff (godmode + moderator)
    def require_management_access!(user)
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner? || user&.staff? || user&.platform_staff?
    end

    # Owner-level access: owner or platform staff (godmode + moderator)
    def require_owner_access!(user)
      raise GraphQL::ExecutionError, "Not authorized" unless user&.owner? || user&.platform_staff?
    end
  end
end
