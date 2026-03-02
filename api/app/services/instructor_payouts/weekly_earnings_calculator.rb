module InstructorPayouts
  class WeeklyEarningsCalculator
    Result = Struct.new(
      :instructor,
      :currency,
      :week_start,
      :week_end,
      :gross_cents,
      :instructor_earnings_cents,
      :studio_cut_cents,
      :sessions_taught_count,
      :payments_count,
      :template_breakdown,
      keyword_init: true
    )

    def initialize(week_start:, week_end: nil, instructor_id: nil, currency: nil, studio_id: nil)
      @week_start = week_start.to_date
      @week_end = (week_end || (@week_start + 6.days)).to_date
      @instructor_id = instructor_id
      @currency = currency&.to_s
      @studio_id = studio_id
    end

    def call
      instructors = User.where(role: User::ROLES[:instructor])
      instructors = instructors.where(studio_id: @studio_id) if @studio_id.present?
      instructors = instructors.where(id: @instructor_id) if @instructor_id

      results = []

      instructors.find_each do |instructor|
        results.concat(calculate_for_instructor(instructor))
      end

      results
    end

    private

    def calculate_for_instructor(instructor)
      sessions_in_week = ClassSession
        .where(instructor_id: instructor.id)
        .where("start_time >= ? AND start_time < ?", @week_start.beginning_of_day, (@week_end + 1.day).beginning_of_day)
        .includes(:class_template)

      sessions_in_week = sessions_in_week.where(studio_id: @studio_id) if @studio_id.present?

      payments_in_week = Payment
        .succeeded
        .joins(class_session: :class_template)
        .where(class_sessions: { instructor_id: instructor.id })
        .where("class_sessions.start_time >= ? AND class_sessions.start_time < ?", @week_start.beginning_of_day, (@week_end + 1.day).beginning_of_day)

      payments_in_week = payments_in_week.where(studio_id: @studio_id) if @studio_id.present?

      payments_in_week = payments_in_week.where(currency: @currency) if @currency.present?

      currencies = payments_in_week.distinct.pluck(:currency)
      currencies = [ @currency ] if @currency.present? && currencies.empty?

      # If there are no payments in the week, still surface a result if there are flat-rate sessions
      if currencies.empty?
        currency = if @studio_id.present?
          PaymentSetting.instance_for(Studio.find(@studio_id)).default_currency.presence
        else
          PaymentSetting.instance.default_currency.presence
        end
        currency ||= "cad"
        return [ build_result(instructor, currency, sessions_in_week, Payment.none, include_flat_sessions: true) ]
      end

      currencies.map do |currency|
        payments_for_currency = payments_in_week.where(currency: currency)
        build_result(instructor, currency, sessions_in_week, payments_for_currency, include_flat_sessions: true)
      end
    end

    def build_result(instructor, currency, sessions_in_week, payments_in_week, include_flat_sessions:)
      gross_cents = payments_in_week.sum(:amount_cents)

      template_breakdown = Hash.new { |h, k| h[k] = { template: nil, gross_cents: 0, instructor_earnings_cents: 0 } }

      # Revenue-share earnings come from payments
      instructor_share_from_payments_cents = 0

      payments_in_week.includes(class_session: :class_template).find_each do |payment|
        session = payment.class_session
        template = session&.class_template
        next unless template

        comp_type = compensation_type_for(template, instructor)
        next unless comp_type == "revenue_share"

        percent = instructor_split_percent_for(template, instructor)
        share = (payment.amount_cents.to_i * percent.to_i) / 100

        instructor_share_from_payments_cents += share

        slot = template_breakdown[template.id]
        slot[:template] ||= template
        slot[:gross_cents] += payment.amount_cents.to_i
        slot[:instructor_earnings_cents] += share
      end

      # Flat-rate earnings come from sessions taught
      instructor_flat_cents = 0
      sessions_taught_count = 0

      if include_flat_sessions
        sessions_in_week.each do |session|
          template = session.class_template
          next unless template

          comp_type = compensation_type_for(template, instructor)
          next unless comp_type == "flat_rate"

          rate_cents = instructor_flat_rate_for(template, instructor)
          next if rate_cents.to_i <= 0

          instructor_flat_cents += rate_cents.to_i
          sessions_taught_count += 1

          slot = template_breakdown[template.id]
          slot[:template] ||= template
          slot[:instructor_earnings_cents] += rate_cents.to_i
        end
      end

      instructor_earnings_cents = instructor_share_from_payments_cents + instructor_flat_cents
      studio_cut_cents = gross_cents - instructor_earnings_cents

      breakdown = template_breakdown.values
        .select { |v| v[:template].present? }
        .map do |v|
          {
            template: v[:template],
            gross_cents: v[:gross_cents],
            instructor_earnings_cents: v[:instructor_earnings_cents]
          }
        end
        .sort_by { |v| v[:template].title.to_s.downcase }

      Result.new(
        instructor: instructor,
        currency: currency,
        week_start: @week_start,
        week_end: @week_end,
        gross_cents: gross_cents,
        instructor_earnings_cents: instructor_earnings_cents,
        studio_cut_cents: studio_cut_cents,
        sessions_taught_count: sessions_taught_count,
        payments_count: payments_in_week.count,
        template_breakdown: breakdown
      )
    end

    def compensation_type_for(template, instructor)
      (template.compensation_type.presence || instructor.instructor_compensation_type.presence || "revenue_share").to_s
    end

    def instructor_split_percent_for(template, instructor)
      template.instructor_split_percent.presence || instructor.instructor_default_split_percent.presence || 50
    end

    def instructor_flat_rate_for(template, instructor)
      template.instructor_flat_rate_cents.presence || instructor.instructor_default_flat_rate_cents.presence || 0
    end
  end
end
