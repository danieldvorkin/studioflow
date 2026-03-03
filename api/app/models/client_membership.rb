class ClientMembership < ApplicationRecord
  STATUSES = %w[active paused cancelled expired].freeze

  belongs_to :studio
  belongs_to :client
  belongs_to :membership_plan

  validates :status, inclusion: { in: STATUSES }
  validates :started_at, presence: true

  scope :active,    -> { where(status: "active") }
  scope :for_studio, ->(studio_id) { where(studio_id: studio_id) }

  before_validation :set_studio_from_plan, on: :create

  def active?
    status == "active"
  end

  def cancel!(notes: nil)
    update!(status: "cancelled", cancelled_at: Time.current, notes: notes.presence || self.notes)
  end

  def pause!
    update!(status: "paused")
  end

  def reactivate!
    update!(status: "active", cancelled_at: nil)
  end

  private

  def set_studio_from_plan
    self.studio_id ||= membership_plan&.studio_id
  end
end
