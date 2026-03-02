class ClassSession < ApplicationRecord
  belongs_to :studio
  belongs_to :class_template
  belongs_to :instructor, class_name: "User", optional: true

  has_many :favorite_class_sessions, dependent: :destroy
  has_many :favorited_by_users, through: :favorite_class_sessions, source: :user
  has_many :bookings, dependent: :destroy

  scope :active, -> { where(archived: false) }

  validates :start_time, presence: true
  validates :capacity, numericality: { greater_than: 0 }, allow_nil: true
  validates :bundle_spots, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validate :end_time_after_start_time
  validate :no_duplicate_template_start_time
  validate :no_overlapping_instructor_session
  validate :no_overlapping_room_session
  validate :bundle_spots_required_when_enabled
  validate :bundle_spots_cannot_exceed_capacity
  validate :associations_belong_to_studio

  before_validation :infer_studio

  def effective_end_time
    return nil unless start_time

    return end_time if end_time.present?

    duration = class_template&.duration_minutes
    duration = 50 unless duration.is_a?(Numeric) && duration.positive?
    start_time + duration.minutes
  end

  def seats_available
    (capacity || class_template.capacity) - bookings.where(status: "booked", archived: false).count
  end

  def bundle_spots_taken
    bookings
      .where(archived: false)
      .where.not(status: "cancelled")
      .where.not(bundle_purchase_id: nil)
      .count
  end

  def bundle_spots_available
    return 0 unless bundle_enabled?
    return 0 unless bundle_spots.to_i.positive?

    [ bundle_spots.to_i - bundle_spots_taken.to_i, 0 ].max
  end

  private

  def infer_studio
    self.studio_id ||= class_template&.studio_id
  end

  def associations_belong_to_studio
    return if studio_id.blank?

    if class_template && class_template.studio_id != studio_id
      errors.add(:class_template, "must belong to the same studio")
    end

    if instructor && instructor.studio_id != studio_id
      errors.add(:instructor, "must belong to the same studio")
    end
  end

  def end_time_after_start_time
    return if start_time.blank? || end_time.blank?
    return if end_time > start_time

    errors.add(:end_time, "must be after start time")
  end

  def no_duplicate_template_start_time
    return if start_time.blank? || class_template_id.blank?

    # Commonly created by repeated clicks/duplicate flows; enforce uniqueness at the same scheduled start.
    if ClassSession.active.where(class_template_id: class_template_id, start_time: start_time).where.not(id: id).exists?
      errors.add(:start_time, "already has this class scheduled at the same time")
    end
  end

  def bundle_spots_required_when_enabled
    return unless bundle_enabled?

    if bundle_spots.to_i <= 0
      errors.add(:bundle_spots, "must be set when bundle is enabled")
    end
  end

  def bundle_spots_cannot_exceed_capacity
    return unless bundle_enabled?
    return unless bundle_spots.to_i.positive?

    cap = (capacity || class_template&.capacity).to_i
    return if cap <= 0

    if bundle_spots.to_i > cap
      errors.add(:bundle_spots, "cannot exceed session capacity")
    end
  end

  def no_overlapping_instructor_session
    return if start_time.blank? || instructor_id.blank?

    this_end = effective_end_time
    return if this_end.blank?

    day_start = start_time.beginning_of_day
    day_end = start_time.end_of_day

    candidates = ClassSession
      .active
      .where(instructor_id: instructor_id)
      .where(start_time: day_start..day_end)
      .where.not(id: id)
      .includes(:class_template)

    overlapping = candidates.any? do |other|
      other_end = other.effective_end_time
      next false if other.start_time.blank? || other_end.blank?

      # Overlap if intervals intersect; allow back-to-back.
      other.start_time < this_end && other_end > start_time
    end

    errors.add(:base, "Instructor already has another session that overlaps this time") if overlapping
  end

  def no_overlapping_room_session
    return if start_time.blank?

    room_name = room.to_s.strip
    return if room_name.blank?

    this_end = effective_end_time
    return if this_end.blank?

    day_start = start_time.beginning_of_day
    day_end = start_time.end_of_day
    location_id = class_template&.studio_location_id

    candidates = ClassSession
      .active
      .joins(:class_template)
      .where(room: room_name)
      .where(start_time: day_start..day_end)
      .where(class_templates: { studio_location_id: location_id })
      .where.not(id: id)
      .includes(:class_template)

    overlapping = candidates.any? do |other|
      other_end = other.effective_end_time
      next false if other.start_time.blank? || other_end.blank?

      other.start_time < this_end && other_end > start_time
    end

    errors.add(:base, "Room #{room_name} already has another session that overlaps this time") if overlapping
  end
end
